import { Column, Grid, InlineNotification, Select, SelectItem, TextArea } from '@carbon/react';
import { type FC, useCallback, useEffect, useMemo, useState } from 'react';

import RegDistSelect from '@/components/core/RegDistSelect';
import ReportPage from '@/components/core/ReportPage';
import { useReportDownload } from '@/components/core/ReportPage/useReportDownload';
import { useAuth } from '@/context/auth/useAuth';
import API from '@/services/APIs';
import type { RegionDistrictRollupLov } from '@/services/lov.service';
import type { ScaleSignatoryBlock } from '@/services/signatureBlocks.service';
import { extractApiError } from '@/utils/extractApiError';

type ReportDownload = {
  blob: Blob;
  filename?: string | null;
};

type LetterReportRequest = {
  regDist: string;
  ccField?: string;
  showSignatureBlockInd?: 'Y' | 'N';
  scaleSignatoryBlockId?: number;
  outputFormat: 'PDF';
  emailRecipient?: string;
  preview: boolean;
};

interface Props {
  title: string;
  subtitle?: string;
  reportBaseName: string;
  letterId: number;
  onBack: () => void;
  // Show the "Show … Signature" toggle (scaler / scale-site auth letters only).
  showSignatureBlockToggle?: boolean;
  // Label for that toggle when shown (legacy: `Show {reportTitle} Signature`).
  signatureLabel?: string;
  // Allow an empty signatory (check scale advisory letter R004 only).
  allowEmptySignatory?: boolean;
  createLetter: (
    letterId: number,
    payload: LetterReportRequest,
    token?: string,
  ) => Promise<ReportDownload>;
}

const LetterOptionsPage: FC<Props> = ({
  title,
  subtitle,
  reportBaseName,
  letterId,
  onBack,
  showSignatureBlockToggle = true,
  signatureLabel = 'Show Signature',
  allowEmptySignatory = false,
  createLetter,
}) => {
  const { userToken } = useAuth();

  const [regDist, setRegDist] = useState('');
  const [ccField, setCcField] = useState('');
  const [showSignatureBlockInd, setShowSignatureBlockInd] = useState<'Y' | 'N'>('Y');
  const [signatureBlocks, setSignatureBlocks] = useState<ScaleSignatoryBlock[]>([]);
  // Set when the signatory lookup itself fails (403 / 5xx / network). Kept apart from "no blocks for
  // this district" so a failed lookup can never pass for an empty one and let a letter go out unsigned.
  const [signatureBlocksError, setSignatureBlocksError] = useState<string | null>(null);
  // Bumped by Reset to re-run the signatory lookup for an unchanged district (e.g. after a failure).
  const [signatureBlocksReload, setSignatureBlocksReload] = useState(0);
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [emailRecipient, setEmailRecipient] = useState('');
  const [previewReport, setPreviewReport] = useState('Yes');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [orgUnits, setOrgUnits] = useState<RegionDistrictRollupLov[]>([]);

  const downloadReport = useReportDownload('PDF', reportBaseName);

  useEffect(() => {
    let mounted = true;

    const loadOrgUnits = async () => {
      try {
        const token = await userToken();
        const results = await API.lov.getRegionDistrictRollupLov(undefined, token);
        if (!mounted) {
          return;
        }
        setOrgUnits(results ?? []);
      } catch {
        if (!mounted) {
          return;
        }
        setOrgUnits([]);
      }
    };

    loadOrgUnits();
    return () => {
      mounted = false;
    };
  }, [userToken]);

  const selectedOrgUnit = useMemo(() => {
    return orgUnits.find((opt) => String(opt.orgUnitCode ?? '') === String(regDist)) ?? null;
  }, [orgUnits, regDist]);

  const orgUnitNo = selectedOrgUnit?.code ?? null;
  const rollupRegionNo = selectedOrgUnit?.rollupRegionNo ?? null;

  useEffect(() => {
    let mounted = true;

    const loadBlocks = async () => {
      try {
        const token = await userToken();
        const requestParams: { orgUnitNo?: number; rollupRegionNo?: number } = {};

        if (orgUnitNo != null) {
          requestParams.orgUnitNo = Number(orgUnitNo);
        }

        if (rollupRegionNo != null) {
          requestParams.rollupRegionNo = Number(rollupRegionNo);
        }

        // The letter lookup, not the Maintenance search: letter authors such as the Check Scaler hold
        // LETTER_SIGNATORY_QUERY but no MAINTAIN_SIGNATORIES_* permission.
        const blocks = await API.signatureBlocks.searchLetterSignatureBlocks(
          requestParams,
          token,
        );
        if (!mounted) {
          return;
        }
        setSignatureBlocksError(null);
        setSignatureBlocks(blocks ?? []);
        const firstId = blocks?.[0]?.scaleSignatoryBlockId;
        setSelectedBlockId(firstId ? String(firstId) : '');
      } catch (err) {
        if (!mounted) {
          return;
        }
        setSignatureBlocks([]);
        setSelectedBlockId('');
        setSignatureBlocksError(extractApiError(err, 'Unable to load signature blocks.'));
      }
    };

    loadBlocks();
    return () => {
      mounted = false;
    };
  }, [orgUnitNo, rollupRegionNo, signatureBlocksReload, userToken]);

  const blockLabel = useCallback((block: ScaleSignatoryBlock) => {
    if (block.fullName) {
      return block.signatureTitle ? `${block.fullName} - ${block.signatureTitle}` : block.fullName;
    }

    const name = [block.lastName, block.firstName].filter(Boolean).join(', ');
    return block.signatureTitle ? `${name} - ${block.signatureTitle}` : name;
  }, []);

  // Required on every letter but the advisory one (R004 allows no signatory) — whether or not any
  // blocks loaded. Keying this on "blocks loaded" is what let an empty picker skip the check.
  const signatureBlockRequired = !allowEmptySignatory;

  const reportRegDist = regDist.trim();

  const onReset = useCallback(() => {
    setRegDist('');
    setCcField('');
    setShowSignatureBlockInd('Y');
    // Keep the loaded blocks and go back to the default (first) one. Clearing them would strand an
    // unchanged district with an empty picker — the lookup only re-runs when the district changes —
    // and, now that a signatory is required, a Send that can never succeed. A changed district reloads.
    const firstId = signatureBlocks[0]?.scaleSignatoryBlockId;
    setSelectedBlockId(firstId ? String(firstId) : '');
    // Re-run the lookup so a failed one can be retried without changing district.
    setSignatureBlocksError(null);
    setSignatureBlocksReload((n) => n + 1);
    setEmailRecipient('');
    setPreviewReport('Yes');
    setError(null);
    setSuccess(null);
  }, [signatureBlocks]);

  const payload: LetterReportRequest = useMemo(() => ({
    regDist: reportRegDist,
    ccField: ccField || undefined,
    showSignatureBlockInd: showSignatureBlockToggle ? showSignatureBlockInd : undefined,
    // Omitted — never `Number('')`, i.e. 0 — when nothing is selected.
    scaleSignatoryBlockId: selectedBlockId ? Number(selectedBlockId) : undefined,
    outputFormat: 'PDF',
    emailRecipient: emailRecipient || undefined,
    preview: previewReport === 'Yes',
  }), [allowEmptySignatory, ccField, emailRecipient, previewReport, reportRegDist, selectedBlockId, showSignatureBlockInd, showSignatureBlockToggle]);

  const handleSend = useCallback(async () => {
    if (!letterId || letterId <= 0) {
      setError('Invalid letter id.');
      return;
    }

    if (signatureBlocksError) {
      setError(signatureBlocksError);
      return;
    }

    if (signatureBlockRequired && !selectedBlockId) {
      setError('Signature block is required.');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const token = await userToken();
      const { blob, filename } = await createLetter(letterId, payload, token);

      if (previewReport === 'Yes' || !emailRecipient) {
        downloadReport(blob, filename);
      }

      setSuccess('Letter generated');
      onBack();
    } catch (err) {
      setError(extractApiError(err, 'Unable to submit letter request'));
    } finally {
      setIsLoading(false);
    }
  }, [letterId, createLetter, downloadReport, emailRecipient, onBack, payload, previewReport, selectedBlockId, signatureBlockRequired, signatureBlocksError, userToken]);

  return (
    <ReportPage
      title={title}
      subtitle={subtitle}
      formClassName="letter-options-form"
      isLoading={isLoading}
      success={success}
      error={error}
      outputOptions={{
        emailRecipient,
        onEmailRecipientChange: setEmailRecipient,
        previewReport,
        onPreviewChange: setPreviewReport,
        onValidationError: () => setSuccess(null),
        onSend: handleSend,
        onReset,
        onBack,
        disabled: isLoading,
        // A failed signatory lookup blocks sending outright; the notification below says why.
        sendDisabled: isLoading || signatureBlocksError != null,
        showHeading: true,
      }}
      showParametersHeading
      parametersHeading="Letter Options"
    >
      <Grid className="scs__form__grid">
        <Column lg={8} md={8} sm={4}>
          <RegDistSelect
            value={regDist}
            onChange={setRegDist}
            hideLabel={false}
            labelText="Org. Unit Signature Block"
            emptyText="All"
            disabled={isLoading}
            districtsOnly={true}
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <Select
            id="signature-blocks-select"
            labelText="Select Letter Signature"
            required={signatureBlockRequired}
            value={selectedBlockId}
            onChange={(e) => setSelectedBlockId(e.target.value)}
            disabled={isLoading || signatureBlocks.length === 0}
          >
            <SelectItem value="" text="" />
            {signatureBlocks.map((block) => (
              <SelectItem
                key={String(block.scaleSignatoryBlockId ?? '')}
                value={String(block.scaleSignatoryBlockId ?? '')}
                text={blockLabel(block)}
              />
            ))}
          </Select>
        </Column>

        <Column lg={8} md={8} sm={4}>
          <TextArea
            id="cc-field"
            labelText="CC Text"
            rows={3}
            value={ccField}
            onChange={(e) => setCcField(e.target.value)}
            disabled={isLoading}
          />
        </Column>

        {showSignatureBlockToggle && (
          <Column lg={8} md={8} sm={4}>
            <Select
              id="show-signature-block-select"
              labelText={signatureLabel}
              value={showSignatureBlockInd}
              onChange={(e) => setShowSignatureBlockInd(e.target.value as 'Y' | 'N')}
              disabled={isLoading}
            >
              <SelectItem value="Y" text="Yes" />
              <SelectItem value="N" text="No" />
            </Select>
          </Column>
        )}

        <Column lg={16} md={8} sm={4}>
          {signatureBlocksError ? (
            <InlineNotification
              kind="error"
              title="Unable to load signature blocks"
              subtitle={signatureBlocksError}
              lowContrast
              hideCloseButton
            />
          ) : null}
          {!signatureBlocksError && regDist && signatureBlocks.length === 0 ? (
            <InlineNotification kind="warning" title="No signature blocks" subtitle="No signature blocks found for this Reg / Dist." lowContrast />
          ) : null}
        </Column>
      </Grid>
      <div className="scs__form__divider" />
    </ReportPage>
  );
};

export default LetterOptionsPage;