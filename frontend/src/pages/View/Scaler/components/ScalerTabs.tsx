import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import type { FC } from 'react';
import type { ScalerSummary } from '@/services/scalers.service';
import type { ScalerTabDefinition } from './scalerTabDefinitions';

export type {
  ScalerTabDefinition,
} from './scalerTabDefinitions';

interface Props {
  activeTabIndex: number;
  onTabChange: (selectedIndex: number) => void;
  scalerLicenceNo: string;
  summary: ScalerSummary;
  /** Sections to render, already filtered by permission by the page. */
  tabs: readonly ScalerTabDefinition[];
}

const ScalerTabs: FC<Props> = ({
  activeTabIndex,
  onTabChange,
  scalerLicenceNo,
  summary,
  tabs,
}) => {
  return (
    <Tabs
      selectedIndex={activeTabIndex}
      onChange={({ selectedIndex }) => onTabChange(selectedIndex)}
    >
      <TabList contained aria-label="Scaler record sections">
        {tabs.map((tab) => (
          <Tab key={tab.slug}>{tab.label}</Tab>
        ))}
      </TabList>

      <TabPanels>
        {tabs.map((tab, index) => (
          <TabPanel key={tab.slug}>
            {tab.render({
              isActive: activeTabIndex === index,
              scalerLicenceNo,
              summary,
            })}
          </TabPanel>
        ))}
      </TabPanels>
    </Tabs>
  );
};

export default ScalerTabs;
