import * as JoiLib from 'joi';

const messages = {
  'any.custom':
    '{{#label}}(은)는 다음과 같은 오류로 처리할 수 없습니다. {{#error.message}}',
  'any.default': '{{#label}}(은)는 처리할 수 없는 기본 오류가 발생하였습니다.',
  'any.failover': '{{#label}}(은)는 처리할 수 없는 오류가 발생하였습니다.',
  'any.invalid': '{{#label}}에 잘못된 값이 있습니다.',
  'any.only':
    '{{#label}} must be {if(#valids.length == 1, "", "one of ")}{{#valids}}',
  'any.ref': '{{#label}} {{#arg}} references {{:#ref}} which {{#reason}}',
  'any.required': '{{#label}}(을)를 반드시 입력해주세요.',
  'any.unknown': '{{#label}}(은)는 사용할 수 없습니다.',
  'string.alphanum': '{{#label}}(은) 알파벳과 숫자만 입력할 수 있습니다.',
  'string.base': '{{#label}}(은)는 글자이여야 합니다.',
  'string.base64': '{{#label}}(은)는 올바른 base64를 입력해주세요.',
  'string.creditCard': '{{#label}}(은)는 올바른 카드 번호를 입력해주세요.',
  'string.dataUri': '{{#label}}(은) 올바른 data url을 입력해주세요.',
  'string.domain': '{{#label}}(은)는 올바른 도메인 주소를 입력해주세요.',
  'string.email': '{{#label}}(은)는 올바른 이메일 주소를 입력해주세요.',
  'string.empty': '{{#label}}(은)는 비워둘 수 없습니다.',
  'string.guid': '{{#label}}(은)는 GUID로 입력해주세요.',
  'string.hex': '{{#label}}(은)는 16진수로 입력해주세요.',
  'string.hexAlign':
    '{{#label}}(은)는 16진수 디코딩시 바이트로 정렬되어야 합니다.',
  'string.hostname': '{{#label}}(은)는 올바른 호스트네임이 아닙니다.',
  'string.ip':
    '{{#label}}(은)는 {#cidr}} CIDR에 해당하는 IP 주소이여야 합니다.',
  'string.ipVersion':
    '{{#label}}(은)는 {{#version}} 버전의 {{#cidr}} CIDR에 해당하는 IP 주소로 입력해주세요.',
  'string.isoDate': '{{#label}}(은)는 ISO 포멧의 날짜로 입력해주세요.',
  'string.isoDuration':
    '{{#label}}(은)는 ISO 8601 포멧에 해당하는 기간으로 입력해주세요.',
  'string.length': '{{#label}}(은)는 반드시 {{#limit}}자로 입력해주세요.',
  'string.lowercase': '{{#label}}(은)는 소문자만 입력할 수 있습니다.',
  'string.max': '{{#label}}(은)는 최대 {{#limit}}자 이하이여야 합니다.',
  'string.min': '{{#label}}(은)는 최소 {{#limit}}자 이상이여야 합니다.',
  'string.normalize':
    '{{#label}}(은)는 {{#form}} 형식으로 정규화된 유니코드이여야 합니다.',
  'string.token':
    '{{#label}}(은)는 알파벳과 숫자를 포함하여 밑줄(_)까지만 입력할 수 있습니다.',
  'string.pattern.base':
    '{{#label}} with value {:[.]} fails to match the required pattern: {{#regex}}',
  'string.pattern.name':
    '{{#label}} with value {:[.]} fails to match the {{#name}} pattern',
  'string.pattern.invert.base':
    '{{#label}} with value {:[.]} matches the inverted pattern: {{#regex}}',
  'string.pattern.invert.name':
    '{{#label}} with value {:[.]} matches the inverted {{#name}} pattern',
  'string.trim': '{{#label}} must not have leading or trailing whitespace',
  'string.uri': '{{#label}}(은)는 올바른 URL이 아닙니다.',
  'string.uriCustomScheme':
    '{{#label}}(은)는 {{#scheme}}를 사용하는 올바른 URL이 아닙니다.',
  'string.uriRelativeOnly': '{{#label}}(은)는 올바른 상대 URL이 아닙니다.',
  'string.uppercase': '{{#label}}(은)는 대문자만 입력할 수 있습니다.',
  'alternatives.all': '{{#label}} does not match all of the required types',
  'alternatives.any': '{{#label}} does not match any of the allowed types',
  'alternatives.match': '{{#label}} does not match any of the allowed types',
  'alternatives.one': '{{#label}} matches more than one allowed type',
  'alternatives.types': '{{#label}} must be one of {{#types}}',
  'array.base': '{{#label}}(은)는 배열이여야 합니다.',
  'array.excludes': '{{#label}} contains an excluded value',
  'array.hasKnown':
    '{{#label}} does not contain at least one required match for type {:#patternLabel}',
  'array.hasUnknown': '{{#label}} does not contain at least one required match',
  'array.includes': '{{#label}} does not match any of the allowed types',
  'array.includesRequiredBoth':
    '{{#label}} does not contain {{#knownMisses}} and {{#unknownMisses}} other required value(s)',
  'array.includesRequiredKnowns':
    '{{#label}} does not contain {{#knownMisses}}',
  'array.includesRequiredUnknowns':
    '{{#label}} does not contain {{#unknownMisses}} required value(s)',
  'array.length': '{{#label}}의 개수가 {{#limit}}개 이여야 합니다.',
  'array.max': '{{#label}}의 개수가 {{#limit}}개 보다 많거나 같아야 합니다.',
  'array.min': '{{#label}}의 개수가 {{#limit}}개 보다 많아야 합니다.',
  'array.orderedLength': '{{#label}} must contain at most {{#limit}} items',
  'array.sort': '{{#label}} must be sorted in {#order} order by {{#by}}',
  'array.sort.mismatching':
    '{{#label}} cannot be sorted due to mismatching types',
  'array.sort.unsupported':
    '{{#label}} cannot be sorted due to unsupported type {#type}',
  'array.sparse': '{{#label}} must not be a sparse array item',
  'array.unique': '{{#label}} contains a duplicate value',
  'boolean.base': '{{#label}}(은)는 예/아니요 중 하나를 선택해야 합니다.',
  'binary.base': '{{#label}}(은)는 문자열이거나 버퍼여야 합니다.',
  'binary.length': '{{#label}}(은)는 {{#limit}}바이트이여야 합니다.',
  'binary.max': '{{#label}} must be less than or equal to {{#limit}} bytes',
  'binary.min': '{{#label}} must be at least {{#limit}} bytes',
  'date.base': '{{#label}}(은)는 올바른 날짜가 아닙니다.',
  'date.format':
    '{{#label}}(은)는 {msg("date.format." + #format) || #format} 포멧이여야 합니다.',
  'date.greater': '{{#label}}(은)는 {{:#limit}} 날짜 이후이여야 합니다.',
  'date.less': '{{#label}}(은)는 {{:#limit}} 날짜 이전이여야 합니다.',
  'date.max': '{{#label}}(은)는 {{:#limit}} 날짜이거나 이전이여야 합니다.',
  'date.min': '{{#label}}(은)는 {{:#limit}} 날짜이거나 이후이여야 합니다.',
  'date.format.iso': 'ISO 8601 표준',
  'date.format.javascript': '타임스템프',
  'date.format.unix': '타임스템프',
  'object.and':
    '{{#label}} contains {{#presentWithLabels}} without its required peers {{#missingWithLabels}}',
  'object.assert':
    '{{#label}} is invalid because {if(#subject.key, `"` + #subject.key + `" failed to ` + (#message || "pass the assertion test"), #message || "the assertion failed")}',
  'object.base': '{{#label}} must be of type {{#type}}',
  'object.instance': '{{#label}} must be an instance of {{:#type}}',
  'object.length':
    '{{#label}} must have {{#limit}} key{if(#limit == 1, "", "s")}',
  'object.max':
    '{{#label}} must have less than or equal to {{#limit}} key{if(#limit == 1, "", "s")}',
  'object.min':
    '{{#label}} must have at least {{#limit}} key{if(#limit == 1, "", "s")}',
  'object.missing':
    '{{#label}} must contain at least one of {{#peersWithLabels}}',
  'object.nand':
    '{{:#mainWithLabel}} must not exist simultaneously with {{#peersWithLabels}}',
  'object.oxor':
    '{{#label}} contains a conflict between optional exclusive peers {{#peersWithLabels}}',
  'object.pattern.match':
    '{{#label}} keys failed to match pattern requirements',
  'object.refType': '{{#label}} must be a Joi reference',
  'object.regex': '{{#label}}(은)는 정규식이여야 합니다.',
  'object.rename.multiple':
    '{{#label}} cannot rename {{:#from}} because multiple renames are disabled and another key was already renamed to {{:#to}}',
  'object.rename.override':
    '{{#label}} cannot rename {{:#from}} because override is disabled and target {{:#to}} exists',
  'object.schema': '{{#label}} must be a Joi schema of {{#type}} type',
  'object.unknown': '{{#label}}(은)는 허용되지 않습니다.',
  'object.with':
    '{{:#mainWithLabel}} missing required peer {{:#peerWithLabel}}',
  'object.without':
    '{{:#mainWithLabel}} conflict with forbidden peer {{:#peerWithLabel}}',
  'object.xor':
    '{{#label}} contains a conflict between exclusive peers {{#peersWithLabels}}',
  'function.arity': '{{#label}}(은)는 {{#n}}개의 인수가 있어야 합니다.',
  'function.class': '{{#label}}(은)는 클래스이여야 합니다.',
  'function.maxArity': '{{#label}}(은)는 {{#n}}개 이하의 인수가 있어야 합니다.',
  'function.minArity': '{{#label}}(은)는 {{#n}}개 이상의 인수가 있어야 합니다.',
  'number.base': '{{#label}}(은)는 반드시 숫자이여야 합니다.',
  'number.greater': '{{#label}}(은)는 {{#limit}}보다 커야합니다.',
  'number.infinity': '{{#label}}(은)는 무한할 수 없습니다.',
  'number.integer': '{{#label}}(은)는 숫자여야 합니다.',
  'number.less': '{{#label}}(은)는 {{#limit}}보다 작아야 합니다.',
  'number.max': '{{#label}}(은)는 {{#limit}}보다 작거나 같아야 합니다.',
  'number.min': '{{#label}}(은)는 {{#limit}}보다 같거나 커야 합니다.',
  'number.multiple': '{{#label}}(은) {{#multiple}}의 배수이여야 합니다.',
  'number.negative': '{{#label}}(은)는 음수이여야 합니다.',
  'number.port': '{{#label}}(은)는 포트 번호(0-65535)여야 합니다.',
  'number.positive': '{{#label}}(은)는 양수이여야 합니다.',
  'number.precision':
    '{{#label}}(은) 소수점 이하 {{#limit}}자를 초과할 수 없습니다.',
  'number.unsafe': '{{#label}}(은)는 64비트 부동 소수점 수로 표현해야 합니다.',
};

export const Joi = JoiLib.defaults((schema) =>
  schema.options({ stripUnknown: true, messages })
);
