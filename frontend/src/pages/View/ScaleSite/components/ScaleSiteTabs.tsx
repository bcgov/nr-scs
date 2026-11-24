import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@carbon/react";
import type { StaticLov } from "@/services/lov.service";
import type { ScaleSiteSummary } from "@/services/scaleSites.service";
import type { FC } from "react";
import type { ScaleSiteTabDefinition } from './scaleSiteTabDefinitions';

export type {
  ScaleSiteTabDefinition,
} from './scaleSiteTabDefinitions';

interface Props {
  activeTabIndex: number;
  onTabChange: (selectedIndex: number) => void;
  scaleSiteIdNmbr: string;
  summary: ScaleSiteSummary | null;
  priorityLovs: StaticLov[];
  scaleMethodTypeLovs: StaticLov[];
  /** Sections to render, already filtered by permission by the page. */
  tabs: readonly ScaleSiteTabDefinition[];
}

const ScaleSiteTabs: FC<Props> = ({
  activeTabIndex,
  onTabChange,
  scaleSiteIdNmbr,
  summary,
  priorityLovs,
  scaleMethodTypeLovs,
  tabs,
}) => {
  return (
    <Tabs
      selectedIndex={activeTabIndex}
      onChange={({ selectedIndex }) => onTabChange(selectedIndex)}
    >
      <TabList contained aria-label="Scale site record sections">
        {tabs.map((tab) => (
          <Tab key={tab.slug}>{tab.label}</Tab>
        ))}
      </TabList>

      <TabPanels>
        {tabs.map((tab, index) => (
          <TabPanel key={tab.slug}>
            {tab.render({
              isActive: activeTabIndex === index,
              scaleSiteIdNmbr,
              summary,
              priorityLovs,
              scaleMethodTypeLovs,
            })}
          </TabPanel>
        ))}
      </TabPanels>
    </Tabs>
  );
};

export default ScaleSiteTabs;
