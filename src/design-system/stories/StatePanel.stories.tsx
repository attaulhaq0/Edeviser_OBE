// Real application pattern, not a fake fetched result or a replacement component.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatePanel } from "@/design-system/patterns";
import { Button } from "@/components/ui/button";

const meta = {
  title: "Patterns/StatePanel",
  component: StatePanel,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "The actual shared presentational states. Defaults come from the real common EN/AR namespace. No authenticated request, academic metric or success response is simulated.",
      },
    },
  },
} satisfies Meta<typeof StatePanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = { args: { variant: "loading" } };
export const Empty: Story = { args: { variant: "empty" } };
export const Error: Story = { args: { variant: "error" } };
export const Partial: Story = { args: { variant: "partial" } };
export const Permission: Story = { args: { variant: "permission" } };

const LocalActionExample = () => {
  const { i18n } = useTranslation();
  const [opened, setOpened] = useState(false);
  const ar = i18n.language.startsWith("ar");
  const label = ar ? "عرض مثال محلي" : "Show Local Example";
  return (
    <div>
      <StatePanel
        variant="partial"
        action={
          <Button type="button" onClick={() => setOpened((value) => !value)}>
            {label}
          </Button>
        }
      />
      {opened && (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          {ar
            ? "هذا تفاعل محلي فقط؛ لم يُرسل أي طلب أو يُحفظ أي سجل."
            : "Local interaction only; no request was sent and no record was saved."}
        </p>
      )}
    </div>
  );
};
export const LocalAction: Story = {
  args: { variant: "partial" },
  render: () => <LocalActionExample />,
  parameters: {
    docs: {
      description: {
        story:
          "The action changes only this local example; it does not retry data or claim a successful academic write.",
      },
    },
  },
};
