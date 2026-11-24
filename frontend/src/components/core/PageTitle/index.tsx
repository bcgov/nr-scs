import { Breadcrumb, BreadcrumbItem, Column } from '@carbon/react';
import { useEffect, type FC } from 'react';
import { useNavigate } from 'react-router-dom';

import Subtitle from '@/components/core/Subtitle';
import UnderConstructionTag from '@/components/core/Tags/UnderConstructionTag';
import { usePageTitle } from '@/context/pageTitle/usePageTitle';

import { type BreadCrumbType } from './types';

import './index.scss';

/**
 * Props for the PageTitle component.
 *
 * @property {string} title - The main title text for the page.
 * @property {string} [subtitle] - Optional subtitle text for the page.
 * @property {boolean} [experimental] - If true, displays an "Under construction" tag.
 * @property {React.ReactNode} [children] - Optional elements to render next to the title.
 * @property {BreadCrumbType[]} [breadCrumbs] - Optional array of breadcrumb objects for navigation.
 */
interface PageTitleProps {
  title: string;
  subtitle?: string;
  experimental?: boolean;
  children?: React.ReactNode;
  breadCrumbs?: BreadCrumbType[];
  noGutter?: boolean;
  useColumn?: boolean;
}

/**
 * PageTitle provides a standardized header for pages, including a title, optional subtitle, breadcrumbs, and an experimental tag.
 * It helps maintain consistent page layouts and navigation.
 *
 * @param {PageTitleProps} props - The props for the component.
 * @returns {JSX.Element} The rendered PageTitle component.
 */
const PageTitle: FC<PageTitleProps> = ({
  title,
  subtitle,
  experimental,
  children,
  breadCrumbs,
  noGutter,
  useColumn = true,
}: PageTitleProps) => {
  const navigate = useNavigate();
  const { setPageTitle } = usePageTitle();

  useEffect(() => {
    setPageTitle();
  }, [setPageTitle]);

  const columnClassName = `page-title-col${noGutter ? ' page-title-col--no-gutter' : ''}`;

  const content = (
    <>
      {breadCrumbs?.length ? (
        <Breadcrumb className="page-title-breadcrumb">
          {breadCrumbs.map((crumb, i) => (
            crumb.path ? (
                <BreadcrumbItem
                    key={`${crumb.name}-${i}`}
                    href={crumb.path}
                    isCurrentPage={!crumb.path}
                    onClick={(e) => {
                      if (!crumb.path) {
                        return;
                      }
                      e.preventDefault();
                      navigate(crumb.path);
                    }}
                >
                  {crumb.name}
                </BreadcrumbItem>
            ) : (
                <span key={`${crumb.name || 'crumb'}-${i}`} className="page-title-plain">
                  <span className="page-title-plain-name">{crumb.name}</span>
                  <span className="page-title-sep">/</span>
                </span>
            )
          ))}
        </Breadcrumb>
      ) : null}
      <div className="page-title-container">
        <div className="title-container">
          <h1>{title}</h1>
          {children}
          {experimental ? <UnderConstructionTag type="page" /> : null}
        </div>
        {subtitle ? <Subtitle text={subtitle} /> : null}
      </div>
    </>
  );

  if (!useColumn) {
    return <div className={columnClassName}>{content}</div>;
  }

  return (
    <Column className={columnClassName} sm={4} md={8} lg={16}>
      {content}
    </Column>
  );
};

export default PageTitle;
