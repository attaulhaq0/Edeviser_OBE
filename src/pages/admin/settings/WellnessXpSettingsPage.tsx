import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { wellnessXpAmountSchema } from "@/lib/schemas/wellnessXpAmount";
import {
  useWellnessXpConfig,
  useUpdateWellnessXpAmount,
} from "@/hooks/useWellnessXpConfig";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Heart } from "lucide-react";
import Shimmer from "@/components/shared/Shimmer";
import { useEffect } from "react";

const formSchema = z.object({
  wellness_xp_amount: wellnessXpAmountSchema,
});

type WellnessXpFormData = z.infer<typeof formSchema>;

const WellnessXpSettingsPage = () => {
  const { data: currentXp, isLoading } = useWellnessXpConfig();
  const mutation = useUpdateWellnessXpAmount();

  const form = useForm<WellnessXpFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { wellness_xp_amount: 5 },
  });

  useEffect(() => {
    if (currentXp !== undefined) {
      form.reset({ wellness_xp_amount: currentXp });
    }
  }, [currentXp, form]);

  const onSubmit = (data: WellnessXpFormData) => {
    mutation.mutate(data.wellness_xp_amount, {
      onSuccess: () => {
        form.reset({ wellness_xp_amount: data.wellness_xp_amount });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Shimmer className="h-8 w-64 rounded-lg" />
        <Shimmer className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Wellness Settings</h1>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background:
              "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
          }}
        >
          <Heart className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            Wellness XP Configuration
          </h2>
        </div>
        <div className="p-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6 max-w-md"
            >
              <FormField
                control={form.control}
                name="wellness_xp_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wellness XP per Completion</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={25}
                        step={1}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        data-testid="wellness-xp-input"
                      />
                    </FormControl>
                    <FormDescription>
                      XP awarded each time a student completes a wellness habit
                      (0–25). Setting this to 0 disables XP for wellness habits.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
              >
                {mutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Save
              </Button>
            </form>
          </Form>
        </div>
      </Card>
    </div>
  );
};

export default WellnessXpSettingsPage;
