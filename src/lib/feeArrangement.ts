export type SubscriptionInterval = "monthly" | "yearly";

export interface SubscriptionPlan {
  id: string;
  name: string;
  interval: SubscriptionInterval;
  price: number;
  description: string;
  features: string[];
  highlight?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "monthly-access",
    name: "Monthly Access",
    interval: "monthly",
    price: 12,
    description: "Full access to the platform for one month.",
    features: [
      "Book consultations",
      "Chat with professionals",
      "Request ambulance support",
      "Priority helpdesk support",
    ],
  },
  {
    id: "yearly-access",
    name: "Yearly Access",
    interval: "yearly",
    price: 120,
    description: "Save more with full-year access to the platform.",
    features: [
      "Everything in Monthly",
      "Best value for regular users",
      "Long-term support",
      "Exclusive platform updates",
    ],
    highlight: true,
  },
];

export function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getPlanDisplayPrice(plan: SubscriptionPlan) {
  const billingPeriod = plan.interval === "yearly" ? "year" : "month";
  return `${formatCurrency(plan.price)}/${billingPeriod}`;
}
