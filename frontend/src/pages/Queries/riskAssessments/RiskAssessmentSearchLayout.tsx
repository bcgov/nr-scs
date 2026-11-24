import {
  Accordion,
  AccordionItem,
  Column,
  Form,
  Grid,
  InlineNotification,
  Select,
  SelectItem,
  TextInput,
} from '@carbon/react';
import { Reset as ResetIcon, Search as SearchIcon } from '@carbon/icons-react';
import type { FormEvent, ReactNode } from 'react';

import Button from '@/components/core/Button';
import PageTitle from '@/components/core/PageTitle';
import SortOptions from '@/components/core/SortOptions';
import TableResource from '@/components/Form/TableResource';
import type { PageableResponse, TableHeaderType } from '@/components/Form/TableResource/types';

/** A `{ value, label }` pair as produced by `mapStaticLovOptions`. */
export type LovOption = { value: string; label: string };

type Props<Row> = {
  /** Page/form/notification/results class names, which differ per screen. */
  pageClassName: string;
  formClassName: string;
  notificationClassName: string;
  resultsClassName: string;

  title: string;
  subtitle: string;
  breadCrumbs: { name: string; path?: string }[];

  lovError: string | null;
  serverError: string | null;
  onDismissServerError: () => void;

  filtersOpen: boolean;
  onToggleFilters: () => void;
  /** True while a LOV is loading or a search is in flight; disables every control. */
  disabled: boolean;

  // --- The three filters both screens share ---
  riskQuestionnaireId: string;
  riskTypeCode: string;
  completeInd: string;
  riskLevelOptions: LovOption[];
  onInputChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;

  /** The screen's own filter columns, rendered after the three shared ones. */
  children: ReactNode;

  sortOptions: { value: string; label: string }[];
  primarySort: string;
  secondarySort: string;
  onPrimarySortChange: (value: string) => void;
  onSecondarySortChange: (value: string) => void;

  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;

  tableHeaders: TableHeaderType<Row>[];
  content: PageableResponse<Row>;
  tableLoading: boolean;
  tableError: boolean;
  onPageChange: (paging: { page: number; pageSize: number }) => void;
};

/**
 * The shared shell for the two risk-assessment query screens. Scaler and Scale Site risk
 * assessments run the same search form over the same three common filters, sort options, actions
 * and results table; only their titles, class names, own filter fields and columns differ, which
 * come in as props and `children`.
 */
const RiskAssessmentSearchLayout = <Row,>({
  pageClassName,
  formClassName,
  notificationClassName,
  resultsClassName,
  title,
  subtitle,
  breadCrumbs,
  lovError,
  serverError,
  onDismissServerError,
  filtersOpen,
  onToggleFilters,
  disabled,
  riskQuestionnaireId,
  riskTypeCode,
  completeInd,
  riskLevelOptions,
  onInputChange,
  children,
  sortOptions,
  primarySort,
  secondarySort,
  onPrimarySortChange,
  onSecondarySortChange,
  onSubmit,
  onReset,
  tableHeaders,
  content,
  tableLoading,
  tableError,
  onPageChange,
}: Props<Row>) => (
  <Grid className={pageClassName}>
    <PageTitle title={title} subtitle={subtitle} breadCrumbs={breadCrumbs} />

    <Column lg={16} md={8} sm={4}>
      <Form onSubmit={onSubmit} className={`${formClassName} scs__form`}>
        {lovError ? (
          <InlineNotification
            kind="error"
            lowContrast
            title="Could not load dropdown options"
            subtitle={lovError}
            hideCloseButton
            className={notificationClassName}
          />
        ) : null}

        {serverError ? (
          <InlineNotification
            kind="error"
            lowContrast
            title="Search failed"
            subtitle={serverError}
            onCloseButtonClick={onDismissServerError}
            className={notificationClassName}
          />
        ) : null}

        <Accordion className="scs-query-accordion">
          <AccordionItem
            title={<h4 style={{ margin: 0 }}>Choose your search parameters.</h4>}
            open={filtersOpen}
            onHeadingClick={onToggleFilters}
          >
            <Grid className="scs__form__grid">
              <Column lg={8} md={8} sm={4}>
                <TextInput
                  id="riskQuestionnaireId"
                  name="riskQuestionnaireId"
                  labelText="Assessment ID"
                  value={riskQuestionnaireId}
                  onChange={onInputChange}
                  disabled={disabled}
                />
              </Column>

              <Column lg={8} md={8} sm={4}>
                <Select
                  id="riskTypeCode"
                  name="riskTypeCode"
                  labelText="Level"
                  value={riskTypeCode}
                  onChange={onInputChange}
                  disabled={disabled}
                >
                  <SelectItem value="" text="" />
                  {riskLevelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} text={option.label} />
                  ))}
                </Select>
              </Column>

              <Column lg={8} md={8} sm={4}>
                <Select
                  id="completeInd"
                  name="completeInd"
                  labelText="Complete"
                  value={completeInd}
                  onChange={onInputChange}
                  disabled={disabled}
                >
                  <SelectItem value="" text="" />
                  <SelectItem value="Y" text="Yes" />
                  <SelectItem value="N" text="No" />
                </Select>
              </Column>

              {children}
            </Grid>

            <div className="scs__form__divider" />

            <SortOptions
              layout="form"
              showHeading
              options={sortOptions}
              primarySort={primarySort}
              onPrimarySortChange={onPrimarySortChange}
              secondarySort={secondarySort}
              onSecondarySortChange={onSecondarySortChange}
              disabled={disabled}
            />
          </AccordionItem>
        </Accordion>

        <Column lg={16} md={8} sm={4} className="form-actions">
          <Button type="submit" renderIcon={SearchIcon} disabled={disabled}>
            Search
          </Button>

          <Button
            type="button"
            kind="secondary"
            onClick={onReset}
            renderIcon={ResetIcon}
            disabled={disabled}
          >
            Reset
          </Button>
        </Column>
      </Form>
    </Column>

    <Column lg={16} md={8} sm={4} className={resultsClassName}>
      <TableResource
        headers={tableHeaders}
        content={content}
        loading={tableLoading}
        error={tableError}
        onPageChange={onPageChange}
      />
    </Column>
  </Grid>
);

export default RiskAssessmentSearchLayout;
