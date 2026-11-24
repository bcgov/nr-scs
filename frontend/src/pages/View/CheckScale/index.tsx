import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Grid,
    Column,
    Modal,
    InlineNotification,
    SkeletonText,
} from '@carbon/react';
import { useAuth } from '@/context/auth/useAuth';
import { PERMISSIONS } from '@/context/auth/permissions';
import API from '@/services/APIs';
import { extractApiError } from '@/utils/extractApiError';
import PermissionGate from '@/components/PermissionGate';
import Button from '@/components/core/Button';
import PageTitle from '@/components/core/PageTitle';
import SpeciesProductGradeSummary from '@/components/core/SpeciesProductGradeSummary';
import WhoDidIt from '@/components/core/WhoDidIt';
import CheckScaleForm from '@/components/Form/CheckScaleForm';
import { asString, buildFormValues, buildSpeciesRows } from '@/components/Form/CheckScaleForm/checkScaleViewModel';
import type { CheckScaleApiModel } from '@/services/checkScales.service';
import type { StaticLov } from '@/services/lov.service';
import './index.scss';

interface CheckScaleTotals {
    tops?: number | null;
    butts?: number | null;
    length?: number | null;
    volume?: number | null;
    pieces?: number | null;
    netValue?: number | null;
}

const formatNumber = (value: number | string | null | undefined, options?: Intl.NumberFormatOptions): string => {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    const numericValue = typeof value === 'string' ? Number(value) : value;
    if (typeof numericValue !== 'number' || Number.isNaN(numericValue)) {
      return String(value);
    }
    return new Intl.NumberFormat('en-CA', options).format(numericValue);
};

const scalerSummaryHref = (licenceNo: string) => `/scalers/view/${encodeURIComponent(licenceNo)}`;

const buildAnalysis = (apiModel: CheckScaleApiModel): {
    originalScale: CheckScaleTotals;
    checkScale: CheckScaleTotals;
    difference: Partial<CheckScaleTotals>;
    variance: Partial<CheckScaleTotals>;
} => {
    // Summary cells default to 0 (legacy format="0"/"0.0"); the Variance % row is always populated.
    const originalScale: CheckScaleTotals = {
        tops: apiModel.originalScaleTotalTops ?? 0,
        butts: apiModel.originalScaleTotalButts ?? 0,
        length: apiModel.originalScaleTotalLength ?? 0,
        volume: apiModel.originalScaleTotalVolume ?? 0,
        pieces: apiModel.originalScaleTotalPieces ?? 0,
        netValue: apiModel.originalScaleNetValue ?? 0,
    };
    const checkScale: CheckScaleTotals = {
        tops: apiModel.chkScaleTotalTops ?? 0,
        butts: apiModel.chkScaleTotalButts ?? 0,
        length: apiModel.chkScaleTotalLength ?? 0,
        volume: apiModel.chkScaleTotalVolume ?? 0,
        pieces: apiModel.chkScaleTotalPieces ?? 0,
        netValue: apiModel.checkScaleNetValue ?? 0,
    };

    const difference: Partial<CheckScaleTotals> = {};
    const variance: Partial<CheckScaleTotals> = {};
    const setDiffAndVar = (key: keyof CheckScaleTotals) => {
        const orig = originalScale[key] ?? 0;
        const chk = checkScale[key] ?? 0;
        difference[key] = orig - chk;
        // Legacy divides the difference by the CHECK total, not the original
        // (TallyBo.getVariance(checkScale, difference) in CheckScaleVwBo) — its `original`
        // parameter name is misleading. Zero check total guards against divide-by-zero.
        variance[key] = chk !== 0 ? ((orig - chk) / chk) * 100 : 0;
    };
    setDiffAndVar('tops');
    setDiffAndVar('butts');
    setDiffAndVar('length');
    setDiffAndVar('volume');
    setDiffAndVar('pieces');
    setDiffAndVar('netValue');

    return { originalScale, checkScale, difference, variance };
};

const CheckScaleViewPage: React.FC = () => {
    const { checkScaleId } = useParams<{ checkScaleId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    // The Check Scales tabs pass the list URL as { backTo } route state so Back / post-delete return
    // to the list, not to browser history (which can be the deleted record's own Edit page).
    const backTo = (location.state as { backTo?: string } | null)?.backTo;
    const { userToken } = useAuth();
    const queryClient = useQueryClient();
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [checkScaleTypeOptions, setCheckScaleTypeOptions] = useState<StaticLov[]>([]);
    const [speciesLov, setSpeciesLov] = useState<StaticLov[]>([]);
    const [productLov, setProductLov] = useState<StaticLov[]>([]);
    const [gradeLov, setGradeLov] = useState<StaticLov[]>([]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const token = await userToken();
                const [typeLov, species, product, grade] = await Promise.all([
                    API.lov.getStaticLov({ tableKey: 'CHECK_SCALE_TYPE_CODE' }, token),
                    API.lov.getStaticLov({ tableKey: 'SCALE_SPECIES_CODE' }, token),
                    API.lov.getStaticLov({ tableKey: 'SCALE_PRODUCT_CODE' }, token),
                    API.lov.getStaticLov({ tableKey: 'SCALE_GRADE_CODE' }, token),
                ]);
                if (!cancelled) {
                    setCheckScaleTypeOptions(typeLov ?? []);
                    setSpeciesLov(species ?? []);
                    setProductLov(product ?? []);
                    setGradeLov(grade ?? []);
                }
            } catch {
                if (!cancelled) {
                    setCheckScaleTypeOptions([]);
                    setSpeciesLov([]);
                    setProductLov([]);
                    setGradeLov([]);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [userToken]);

    const { data, isLoading, isError } = useQuery<CheckScaleApiModel, Error>({
        queryKey: ['checkScale', checkScaleId],
        queryFn: async () => {
            const token = await userToken();
            if (!checkScaleId) {
                throw new Error('Check Scale ID is not provided');
            }
            return (await API.checkScale.getCheckScale(checkScaleId, token)) as unknown as CheckScaleApiModel;
        },
        enabled: !!checkScaleId,
    });

    const speciesRows = useMemo(
        () => buildSpeciesRows(data?.speciesSummary, speciesLov, gradeLov, productLov),
        [data?.speciesSummary, speciesLov, gradeLov, productLov],
    );

    const handleDelete = async () => {
        if (!checkScaleId) {
          return;
        }
        setDeleteError('');
        setIsDeleting(true);
        try {
            const token = await userToken();
            await API.checkScale.deleteCheckScale(checkScaleId, token);
            // Drop only the cached tab lists so the scaler / scale site Check Scales tabs no longer
            // show the deleted row. Deliberately NOT removing ['checkScale', checkScaleId]: that
            // query is still this page's active observer, and dropping it would trigger a doomed
            // refetch of the just-deleted id (GET -> 404) before we navigate away.
            queryClient.removeQueries({ queryKey: ['scaler-check-scales'] });
            queryClient.removeQueries({ queryKey: ['scale-site-check-scales'] });
            setDeleteConfirmOpen(false);
            navigate(backTo ?? -1);
        } catch (err) {
            setDeleteConfirmOpen(false);
            setDeleteError(extractApiError(err, 'Delete failed'));
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <Grid>
                <Column lg={16} md={8} sm={4}>
                    <PageTitle title="Check Scale" />
                    <SkeletonText paragraph />
                    <SkeletonText paragraph />
                    <SkeletonText paragraph />
                </Column>
            </Grid>
        );
    }

    if (isError || !data) {
        return (
            <Grid>
                <Column lg={16} md={8} sm={4}>
                    <PageTitle title="Error" />
                    <p>Could not retrieve check scale data.</p>
                </Column>
            </Grid>
        );
    }

    // View displays net value at 0 decimals to match legacy format="0".
    const formValues = buildFormValues(data, 0);
    const { originalScale, checkScale, difference, variance } = buildAnalysis(data);

    // Legacy (LGCS) check scales are read-only — Edit/Delete are disabled (legacy CheckScaleBo.LEGACY_CKSC).
    const isLegacyCheckScale = data.ckscType === 'LGCS';

    return (
        <Grid className="report-grid view-check-scale">
            <Column lg={16} md={8} sm={4}>
                <PageTitle
                    title="Check Scale"
                    breadCrumbs={[
                        { name: 'Scalers', path: '/scalers' },
                        { name: 'Check Scale', path: `/check-scales/view/${checkScaleId}` },
                    ]}
                />

                {deleteError && (
                    <InlineNotification
                        kind="error"
                        lowContrast
                        title="Delete failed"
                        subtitle={deleteError}
                        onCloseButtonClick={() => setDeleteError('')}
                        style={{ marginBottom: '16px' }}
                    />
                )}

                <div className="scs__form" style={{ marginBottom: '24px' }}>
                    <div className="view-check-scale__check-scale-id">
                        <strong>Check Scale #:</strong> {asString(data.checkScaleId)}
                    </div>

                    <CheckScaleForm
                        mode="view"
                        values={formValues}
                        checkScaleTypeOptions={checkScaleTypeOptions}
                        licenceLinkHref={scalerSummaryHref}
                    />

                    <div style={{ marginTop: '24px' }}>
                        <h4 className="view-check-scale__subtitle">Check Scale Summary</h4>
                        <Grid style={{ rowGap: '16px' }}>
                            <Column lg={16} md={8} sm={4}>
                                <Table useZebraStyles size="sm" className="view-check-scale__summary-table">
                    <TableHead>
                        <TableRow>
                            <TableHeader scope="col">Totals</TableHeader>
                            <TableHeader scope="col">Tops</TableHeader>
                            <TableHeader scope="col">Butts</TableHeader>
                            <TableHeader scope="col">Length</TableHeader>
                            <TableHeader scope="col">Volume</TableHeader>
                            <TableHeader scope="col">Pieces</TableHeader>
                            <TableHeader scope="col">Net Value</TableHeader>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <TableCell className="view-check-scale__label">Original:</TableCell>
                            <TableCell>{formatNumber(originalScale.tops, { maximumFractionDigits: 0 })}</TableCell>
                            <TableCell>{formatNumber(originalScale.butts, { maximumFractionDigits: 0 })}</TableCell>
                            <TableCell>{formatNumber(originalScale.length, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</TableCell>
                            <TableCell>{formatNumber(originalScale.volume, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</TableCell>
                            <TableCell>{formatNumber(originalScale.pieces, { maximumFractionDigits: 0 })}</TableCell>
                            <TableCell>{formatNumber(originalScale.netValue, { maximumFractionDigits: 0 })}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="view-check-scale__label">Check:</TableCell>
                            <TableCell>{formatNumber(checkScale.tops, { maximumFractionDigits: 0 })}</TableCell>
                            <TableCell>{formatNumber(checkScale.butts, { maximumFractionDigits: 0 })}</TableCell>
                            <TableCell>{formatNumber(checkScale.length, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</TableCell>
                            <TableCell>{formatNumber(checkScale.volume, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</TableCell>
                            <TableCell>{formatNumber(checkScale.pieces, { maximumFractionDigits: 0 })}</TableCell>
                            <TableCell>{formatNumber(checkScale.netValue, { maximumFractionDigits: 0 })}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="view-check-scale__label">Difference:</TableCell>
                            <TableCell>{formatNumber(difference.tops, { maximumFractionDigits: 0 })}</TableCell>
                            <TableCell>{formatNumber(difference.butts, { maximumFractionDigits: 0 })}</TableCell>
                            <TableCell>{formatNumber(difference.length, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</TableCell>
                            <TableCell>{formatNumber(difference.volume, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</TableCell>
                            <TableCell>{formatNumber(difference.pieces, { maximumFractionDigits: 0 })}</TableCell>
                            <TableCell>{formatNumber(difference.netValue, { maximumFractionDigits: 0 })}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="view-check-scale__label">Variance %:</TableCell>
                            <TableCell>{formatNumber(variance.tops, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</TableCell>
                            <TableCell>{formatNumber(variance.butts, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</TableCell>
                            <TableCell>{formatNumber(variance.length, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</TableCell>
                            <TableCell>{formatNumber(variance.volume, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</TableCell>
                            <TableCell>{formatNumber(variance.pieces, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</TableCell>
                            <TableCell>{formatNumber(variance.netValue, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</TableCell>
                        </TableRow>
                                    </TableBody>
                                </Table>
                            </Column>
                        </Grid>
                    </div>

                    <div style={{ marginTop: '24px' }}>
                        <h4 className="view-check-scale__subtitle">Species Product Grade Summary</h4>
                        <Grid style={{ rowGap: '16px' }}>
                            <Column lg={16} md={8} sm={4}>
                                <SpeciesProductGradeSummary rows={speciesRows} isSortable size="sm" />
                            </Column>
                        </Grid>
                    </div>

                    {/*
                      The route only requires CHECK_SCALE_QUERY, so every control that does something
                      names its own permission — §I gives this row CR/RU to the field roles and the D to
                      the administrator alone. Back is never gated: a role that can open a page needs a
                      way off it, and for a read-only role it is the only control left here.
                    */}
                    <div className="form-actions" style={{ marginTop: '16px' }}>
                        <Button onClick={() => navigate(backTo ?? -1)} className="action-btn">
                            Back
                        </Button>
                        <PermissionGate permission={PERMISSIONS.CHECK_SCALE_UPDATE}>
                            <Button
                                className="action-btn"
                                disabled={isLegacyCheckScale}
                                onClick={() => navigate(`/check-scales/edit/${encodeURIComponent(String(data.checkScaleId))}`)}
                            >
                                Edit Record
                            </Button>
                        </PermissionGate>
                        <PermissionGate permission={PERMISSIONS.CHECK_SCALE_ADVISORY_LETTER_CREATE}>
                            <Button
                                className="action-btn"
                                onClick={() => navigate(`/check-scales/${encodeURIComponent(String(data.checkScaleId))}/advisory-letter`)}
                            >
                                Create Letter
                            </Button>
                        </PermissionGate>
                        <PermissionGate permission={PERMISSIONS.CHECK_SCALE_CREATE}>
                            <Button className="action-btn" onClick={() => navigate('/check-scales/create')}>
                                Add Check Scale
                            </Button>
                        </PermissionGate>
                        <PermissionGate permission={PERMISSIONS.CHECK_SCALE_DELETE}>
                            <Button
                                className="action-btn"
                                disabled={isLegacyCheckScale}
                                onClick={() => setDeleteConfirmOpen(true)}
                            >
                                Delete
                            </Button>
                        </PermissionGate>
                        <WhoDidIt audit={data} />
                    </div>
                </div>
            </Column>

            <Modal
                open={deleteConfirmOpen}
                onRequestClose={() => setDeleteConfirmOpen(false)}
                danger
                modalHeading="Are you sure you want to delete this record?"
                primaryButtonText="Confirm Delete"
                secondaryButtonText="Cancel"
                primaryButtonDisabled={isDeleting}
                onSecondarySubmit={() => setDeleteConfirmOpen(false)}
                onRequestSubmit={() => {
                    handleDelete();
                }}
            />
        </Grid>
    );
};

export default CheckScaleViewPage;
