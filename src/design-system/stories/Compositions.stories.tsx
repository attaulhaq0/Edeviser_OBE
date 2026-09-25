// Actual shared patterns from their public barrel. No shadow implementation.
import { BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PCard, SectionHeader, PageHeader } from "@/design-system/patterns";

const meta = {
  title: "Patterns/ReadingSurfaces",
  component: PCard,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Static PCard and real semantic headings. This is not a link, button, assessment result, routed page or live data fixture.",
      },
    },
  },
} satisfies Meta<typeof PCard>;
export default meta;
type Story = StoryObj<typeof meta>;

const ReadingExample = ({ extended = false }: { extended?: boolean }) => {
  const { t } = useTranslation("common");
  return (
    <div>
      <PageHeader title={t("header.notificationsLabel")} />
      <PCard className="mt-4 p-6">
        <SectionHeader
          icon={BookOpen}
          title={t("statePanel.empty")}
          description={t("statePanel.partial")}
          as="h2"
        />
        {extended && (
          <p className="mt-4 text-sm text-muted-foreground [overflow-wrap:anywhere]">
            {t("statePanel.partial")} {t("statePanel.empty")}{" "}
            {t("statePanel.permission")}
          </p>
        )}
      </PCard>
    </div>
  );
};
export const Default: Story = {
  args: { children: null },
  render: () => <ReadingExample />,
};
export const ExtendedCopy: Story = {
  args: { children: null },
  render: () => <ReadingExample extended />,
};
