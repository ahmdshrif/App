## Proposal: Fix App Crash When Sending Invoice to New Users

### Please re-state the problem that we are trying to solve in this issue.

The app crashes when a user tries to send an invoice to someone who doesn't have an account yet in the Reports > Invoices section.

### What is the root cause of that problem?

The `TransactionListItemRow.tsx` component tries to access `accountID` property directly from user objects that may be undefined for new users. This causes a TypeError that crashes the app.

### What changes do you think we should make in order to solve the problem?

Add null checks when accessing user properties in the `TransactionListItemRow` component:
- Use optional chaining (`?.`) when accessing the `accountID` properties
- Add fallback values (like `-1`) to ensure valid data is always passed

### What specific scenarios should we cover in automated tests to prevent reintroducing this issue in the future?

1. Test the component renders correctly when user objects have missing `accountID` properties
2. Test the invoice sending flow with non-existent email addresses
3. Test with various combinations of undefined user properties

### What alternative solutions did you explore? (Optional)

1. Fixing the data at its source before it reaches the component
2. Using a wrapper component to validate the data
3. Implementing React error boundaries

The direct approach of adding null checks is the simplest and most effective solution.