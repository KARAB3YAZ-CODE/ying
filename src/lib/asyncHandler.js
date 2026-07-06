// wraps an async Express route handler so rejected promises reach next(err)
// instead of becoming an unhandled rejection that can hang/crash the function
export function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
