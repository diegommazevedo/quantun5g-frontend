/**
 * Gate de onboarding RT — reexporta contratante-onboarding-gate (compat).
 */

export {
  NR01_SELF_SERVICE_ONBOARDING_PATH as RT_ONBOARDING_PATH,
  findContratanteOnboardingGap,
  findCompanyPendingRtOnboarding,
  shouldEnforceNr01SelfServiceOnboarding,
  shouldEnforceRtOnboarding,
  type CompanyPendingRt,
  type ContratanteOnboardingGap,
} from '@/lib/nr01/contratante-onboarding-gate'
