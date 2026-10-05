/**
 * 错误码到中文提示的映射。
 *
 * 这是一个值得说明的分工设计：
 *   后端负责判定「哪里错了」，给出稳定的机器可读错误码（如 DIVISION_BY_ZERO）；
 *   前端负责决定「怎么跟用户说」，把错误码翻译成人话。
 *
 * 为什么不直接让后端返回中文？
 * 因为那样后端就被绑定在一种语言上，将来做多语言界面时接口也得跟着改。
 * 让接口返回与语言无关的错误码，展示层各自本地化，是更常见的工程做法。
 * 同时后端仍会返回一句英文 message，方便直接用 curl 调试接口的人看懂。
 */

const ERROR_MESSAGES = Object.freeze({
  // ---- 计算错误 ----
  EXPRESSION_REQUIRED: '请输入要计算的表达式。',
  EXPRESSION_TOO_LONG: '表达式太长了，最多允许 200 个字符。',
  EXPRESSION_TOO_DEEP: '括号嵌套太深了，最多支持 64 层。',
  ILLEGAL_CHARACTER: '表达式里出现了无法识别的字符，只能使用数字、运算符、括号和函数名。',
  UNEXPECTED_TOKEN: '表达式写法有问题：运算符或括号的位置不对。',
  UNEXPECTED_END: '表达式没有写完，末尾还缺少一个数字或括号。',
  UNBALANCED_PARENTHESIS: '括号没有配对，请检查左右括号数量是否相等。',
  UNKNOWN_IDENTIFIER: '不认识这个函数名或常量名，请检查拼写。',
  BAD_ARGUMENT_COUNT: '函数参数个数不对，请检查括号里的参数。',
  DIVISION_BY_ZERO: '除数不能为零。',
  DOMAIN_ERROR: '这个取值超出了函数的定义域（例如对负数开平方、对零取对数）。',
  RESULT_NOT_FINITE: '计算结果超出了可表示的范围。',

  // ---- 历史记录错误 ----
  INVALID_HISTORY_ID: '历史记录编号不合法。',
  HISTORY_NOT_FOUND: '这条历史记录已经不存在了，可能已被删除。',
  INVALID_PAGINATION: '分页参数不合法。',

  // ---- 换算错误 ----
  INVALID_BASE_CONVERSION: '进制换算参数不合法，请检查数值里的数字是否都属于该进制。',
  INVALID_UNIT_CONVERSION: '单位换算参数不合法，请检查类别与单位是否匹配。',

  // ---- 接口与网络 ----
  MALFORMED_JSON: '请求格式错误。',
  ROUTE_NOT_FOUND: '接口不存在，请确认后端地址是否配置正确。',
  INTERNAL_ERROR: '服务器内部错误，请稍后重试。',
  NETWORK_ERROR: '无法连接后端服务。请确认后端已经启动，并且地址配置正确。',
  TIMEOUT: '请求超时，后端服务没有在规定时间内响应。',
});

/**
 * 把错误对象翻译成给用户看的一句话。
 * @param {{code?: string, message?: string}} error
 * @returns {string}
 */
export function describeError(error) {
  const code = error?.code;
  const friendly = ERROR_MESSAGES[code];

  if (friendly) {
    // 保留错误码：既方便用户截图反馈，也方便开发者对照网络面板排查。
    return `${friendly}［${code}］`;
  }

  if (error?.message) {
    return `${error.message}［${code ?? 'UNKNOWN'}］`;
  }

  return '发生了未知错误。';
}

export default describeError;
