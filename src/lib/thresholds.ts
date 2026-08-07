// Central place to tune what counts as "needs attention". Adjust freely —
// these numbers are starting guesses, not measured baselines yet.

export const THRESHOLDS = {
  paymentsPendingWarn: 10,
  paymentsPendingCrit: 25,

  duopayOverdueWarnNGN: 100_000,
  duopayOverdueCritNGN: 500_000,

  shieldActiveSessionsWarn: 1, // any active SHIELD session merits eyes-on

  openTicketsWarn: 15,
  openTicketsCrit: 40,

  // 3+ failed admin logins for the same account within a ~50-event window
  // is treated as a possible brute-force attempt.
  adminLoginFailuresForBruteForce: 3,
};
