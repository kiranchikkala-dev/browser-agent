# Performance ledger

## Browser navigation and mobile launch

| Area | Baseline | Result | Verdict |
| --- | --- | --- | --- |
| Agent settle budget after navigation/action | Up to 3,250 ms (`networkidle` 3,000 ms + 250 ms buffer) | Up to 850 ms (`networkidle` 750 ms + 100 ms buffer) | Kept |
| Scroll action buffer | 400 ms | 150 ms | Kept |
| Mobile sidebar launch | Fetches task history immediately while the drawer is closed | Fetch waits until the drawer opens | Kept |
| Sidebar history payload | Unbounded | Latest 20 tasks | Kept |

The browser timing budget is intentionally bounded because many real pages keep
analytics, ads, or streaming requests open and never reach network idle. The
`waitForSettled` test guards the configured budget and ordering. Re-run the same
mobile browser journey on representative devices before changing these values.
