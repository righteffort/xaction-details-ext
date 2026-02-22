## Future Amazon scraping: highlights from https://github.com/philipmulcahy/azad
* order detail parser is `extractDetailPromise` https://github.com/philipmulcahy/azad/blob/master/src/js/order_details.ts#L38
* order discovery starts in `reallyScrapeAndPublish` https://github.com/philipmulcahy/azad/blob/master/src/js/transaction.ts#L40
** but just use `extractAllTransactionsWithNextButton` not `...WithScrolling`
** and will need to filter by date range (at least min)
** guts are in transaction[0-9].ts `extractPageOfTransactions`
* Should be its own library
** Would be nice to fold back into azad but would require a fair amount of refactoring (azad code entangles caching, stats, status updates, maybe paywalled details, I don't know what else)
