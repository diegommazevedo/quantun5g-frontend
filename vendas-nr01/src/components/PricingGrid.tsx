import { SALES_PLANS } from '@/constants/plans'
import { PlanCard } from '@/components/PlanCard'

export function PricingGrid() {
  return (
    <ul className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2 xl:grid-cols-4">
      {SALES_PLANS.map((plan) => (
        <li key={plan.id} className="flex">
          <PlanCard plan={plan} />
        </li>
      ))}
    </ul>
  )
}
