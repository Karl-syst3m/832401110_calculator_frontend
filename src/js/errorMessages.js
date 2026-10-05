/**
 * Mapping from error codes to user-facing messages.
 *
 * This division of labor is worth explaining:
 *   the backend decides "what went wrong" and returns a stable, machine-readable error code (such as DIVISION_BY_ZERO);
 *   the frontend decides "how to tell the user", translating the error code into plain language.
 *
 * Why not have the backend return the text itself?
 * Because the backend would then be tied to a single language, and building a multilingual UI later would force the API to change along with it.
 * Having the API return language-independent error codes and letting each presentation layer localize them is the more common engineering practice.
 * At the same time the backend still returns a one-sentence English message, so that anyone debugging the API directly with curl can understand it.
 */

const ERROR_MESSAGES = Object.freeze({
  // ---- Calculation errors ----
  EXPRESSION_REQUIRED: 'Enter an expression to calculate.',
  EXPRESSION_TOO_LONG: 'The expression is too long; at most 200 characters are allowed.',
  EXPRESSION_TOO_DEEP: 'The parentheses are nested too deeply; at most 64 levels are supported.',
  ILLEGAL_CHARACTER: 'The expression contains an unrecognized character; only digits, operators, parentheses and function names may be used.',
  UNEXPECTED_TOKEN: 'The expression is malformed: an operator or parenthesis is in the wrong position.',
  UNEXPECTED_END: 'The expression is incomplete; a number or a closing parenthesis is missing at the end.',
  UNBALANCED_PARENTHESIS: 'The parentheses do not match; check that the number of opening and closing parentheses is equal.',
  UNKNOWN_IDENTIFIER: 'This function or constant name is not recognized; check the spelling.',
  BAD_ARGUMENT_COUNT: 'The function has the wrong number of arguments; check the arguments inside the parentheses.',
  DIVISION_BY_ZERO: 'Cannot divide by zero.',
  DOMAIN_ERROR: 'This value is outside the domain of the function (for example taking the square root of a negative number or the logarithm of zero).',
  RESULT_NOT_FINITE: 'The result is outside the representable range.',

  // ---- History errors ----
  INVALID_HISTORY_ID: 'The history record ID is invalid.',
  HISTORY_NOT_FOUND: 'This history record no longer exists; it may have been deleted.',
  INVALID_PAGINATION: 'The pagination parameters are invalid.',

  // ---- Conversion errors ----
  INVALID_BASE_CONVERSION: 'The base conversion parameters are invalid; check that every digit in the value belongs to that base.',
  INVALID_UNIT_CONVERSION: 'The unit conversion parameters are invalid; check that the category and the units match.',

  // ---- API and network ----
  MALFORMED_JSON: 'The request is malformed.',
  ROUTE_NOT_FOUND: 'This endpoint does not exist; check that the backend address is configured correctly.',
  INTERNAL_ERROR: 'Internal server error; please try again later.',
  NETWORK_ERROR: 'Cannot connect to the backend service. Make sure the backend is running and the address is configured correctly.',
  TIMEOUT: 'The request timed out; the backend service did not respond within the time limit.',
});

/**
 * Translate an error object into a single sentence shown to the user.
 * @param {{code?: string, message?: string}} error
 * @returns {string}
 */
export function describeError(error) {
  const code = error?.code;
  const friendly = ERROR_MESSAGES[code];

  if (friendly) {
    // Keep the error code: it makes screenshot feedback from users easier, and helps developers cross-check the network panel when investigating.
    return `${friendly}[${code}]`;
  }

  if (error?.message) {
    return `${error.message}[${code ?? 'UNKNOWN'}]`;
  }

  return 'An unknown error occurred.';
}

export default describeError;
