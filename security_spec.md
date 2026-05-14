# Security Specification for Finovaa Earning App

## Data Invariants
1. A user profile (`/users/{userId}`) can only be created with an UID that matches the authenticated user.
2. The `balance` of a user can only increase through legitimate task completion (handled via logic) or admin adjustment (not implemented yet, but rules should restrict it).
3. A user cannot modify their own `balance` or `withdrawn` fields directly without matching the validation schema.
4. Withdrawal requests (`/withdrawals/{withdrawalId}`) must belong to the user who created them.
5. Once a withdrawal is created, its `status` can only be changed by an admin (not implemented, but rules will protect it).
6. Users cannot spoof their `referrals` count.

## The "Dirty Dozen" Payloads
1. **Balance Hijack**: An authenticated user tries to update their balance from $0 to $1,000,000.
2. **Identity Spoofing**: User A tries to create a profile for User B.
3. **Withdrawal for Others**: User A tries to create a withdrawal request with `userId` of User B.
4. **Referral Count Inflation**: User tries to set their own `referrals` to 9999.
5. **Admin Escape**: User tries to create an `admins` document for themselves.
6. **Task Speedrun**: User tries to update `lastTaskReset` to a future date to bypass reset limits.
7. **PII Leak**: Authenticated user tries to list all user profiles to harvest emails/IDs.
8. **Shadow Field Injection**: User tries to add `isVerified: true` to their profile.
9. **Terminal State Bypass**: User tries to change a "success" withdrawal back to "pending" to retry a payout.
10. **Resource Exhaustion**: User tries to use a 1MB string as a `uid`.
11. **Negative Balance**: User tries to set `balance` to -100.
12. **Orphaned Withdrawal**: Creating a withdrawal for a non-existent user profile.

## Test Runner (Logic Overview)
The `firestore.rules` will be tested using the standard Firebase emulator patterns to ensure all these payloads fail.
