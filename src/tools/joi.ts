import * as JoiLib from 'joi';

const messages = {
  'any.custom':
    '{{#label}}(은)는 다음과 같은 오류로 처리할 수 없습니다. {{#error.message}}',
  'any.default': '{{#label}}(은)는 처리할 수 없는 기본 오류가 발생하였습니다.',
  'any.failover': '{{#label}}(은)는 처리할 수 없는 오류가 발생하였습니다.',
  'any.invalid': '{{#label}}에 잘못된 값이 있습니다.',
  'any.only':
    '{{#label}}(은)는 {if(#valids.length == 1, "", "중 하나 ")}{{#valids}}',
  'any.ref':
    '{{#label}}(은)는 반드시 {{#arg}}을(를) 요청한 {{:#ref}}를 참조합니다. {{#reason}}',
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
    '값이 {:[.]}인 {{#label}}(은)는 필수 패턴과 일치하지 않음: {{#regex}}',
  'string.pattern.name':
    '값이 {:[.]}인 {{#label}}(은)는 이름 패턴과 일치하지 않습니다.',
  'string.pattern.invert.base':
    '값이 {:[.]}인 {{#label}}(은)는 반전된 패턴과 일치합니다: {{#regex}}',
  'string.pattern.invert.name':
    '값이 {:[.]}인 {{#label}}(은)는 반전된 {{#name}} 패턴과 일치합니다.',
  'string.trim': '{{#label}}에는 선행 또는 후행 공백이 없어야 합니다.',
  'string.uri': '{{#label}}(은)는 올바른 URL이 아닙니다.',
  'string.uriCustomScheme':
    '{{#label}}(은)는 {{#scheme}}를 사용하는 올바른 URL이 아닙니다.',
  'string.uriRelativeOnly': '{{#label}}(은)는 올바른 상대 URL이 아닙니다.',
  'string.uppercase': '{{#label}}(은)는 대문자만 입력할 수 있습니다.',
  'alternatives.all': '{{#label}}(은)는 모든 필수 유형과 일치하지 않습니다.',
  'alternatives.any': '{{#label}}(은)는 허용된 유형과 일치하지 않습니다.',
  'alternatives.match': '{{#label}}(은)는 허용된 유형과 일치하지 않습니다.',
  'alternatives.one': '{{#label}}(은)는 둘 이상의 허용된 유형과 일치',
  'alternatives.types':
    '{{#label}}는 반드시 다음 중 하나여야 합니다. {{#types}}',
  'array.base': '{{#label}}(은)는 배열이여야 합니다.',
  'array.excludes': '{{#label}}(은)는 제외된 값을 포함합니다.',
  'array.hasKnown':
    '{{#label}}(은)는 유형에 대한 필수 일치 항목이 하나 이상 포함되어 있지 않습니다. {:#patternLabel}',
  'array.hasUnknown':
    '{{#label}}(은)는 하나 이상의 필수 일치 항목이 포함되어 있지 않습니다.',
  'array.includes': '{{#label}}(은)는 허용된 유형과 일치하지 않습니다.',
  'array.includesRequiredBoth':
    '{{#label}}(은)는 {{#knownMisses}}(과)와 {{#unknownMisses}} 다른 필수 값이 포함되어 있지 않습니다.',
  'array.includesRequiredKnowns':
    '{{#label}}(은)는 {{#knownMisses}}가 포함되어 있지 않습니다.',
  'array.includesRequiredUnknowns':
    '{{#label}}(은)는 {{#unknownMisses}} 필수 값이 포함되어 있지 않습니다.',
  'array.length': '{{#label}}의 개수가 {{#limit}}개 이여야 합니다.',
  'array.max': '{{#label}}의 개수가 {{#limit}}개 보다 많거나 같아야 합니다.',
  'array.min': '{{#label}}의 개수가 {{#limit}}개 보다 많아야 합니다.',
  'array.orderedLength':
    '{{#label}}(은)는 최대 {{#limit}} 항목을 포함해야 합니다.',
  'array.sort':
    '{{#label}}(은)는 {{#by}}에 의해 {#order} 순서로 정렬되어야 합니다.',
  'array.sort.mismatching':
    '{{#label}}(은)는 유형이 일치하지 않아 정렬할 수 없습니다.',
  'array.sort.unsupported':
    '{{#label}}(은)는 지원되지 않는 유형({#type})으로 인해 정렬할 수 없습니다.',
  'array.sparse': '{{#label}}(은)는 희소 배열 항목이 아니어야 합니다.',
  'array.unique': '{{#label}}(은)는 중복 값을 포함되어 있습니다.',
  'boolean.base': '{{#label}}(은)는 예/아니요 중 하나를 선택해야 합니다.',
  'binary.base': '{{#label}}(은)는 문자열이거나 버퍼여야 합니다.',
  'binary.length': '{{#label}}(은)는 {{#limit}}바이트이여야 합니다.',
  'binary.max': '{{#label}}(은)는 {{#limit}}바이트 이하여야 합니다.',
  'binary.min': '{{#label}}(은)는 {{#limit}}바이트 이상이어야 합니다.',
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
    '{{#label}}에는 필수 피어인 {{#presentWithLabels}} 없이 {{#missingWithLabels}}(이)가 포함됩니다.',
  'object.assert':
    '{{#label}}(은)는 올바르지 않은 값입니다. {if(#subject.key, `"` + #subject.key + `" 는 ` + (#message || "테스트를 통과했습니다."), #message || "테스트에 통과하지 못했습니다.)}',
  'object.base': '{{#label}}(은)는 반드시 {{#type}} 타입이여야 합니다.',
  'object.instance': '{{#label}}(은)는 {{:#type}} 타입의 인스턴스여야 합니다.',
  'object.length':
    '{{#label}}(은)는 반드시 {{#limit}}개의 키값이 있어야 합니다.',
  'object.max':
    '{{#label}}(은)는 반드시 {{#limit}}개의 키값보다 적거나 같아야 합니다.',
  'object.min':
    '{{#label}}(은)는 반드시 {{#limit}}개의 키값보다 적어야 합니다.',
  'object.missing':
    '{{#label}}(은)는 {{#peersWithLabels}} 중 하나 이상을 포함해야 합니다.',
  'object.nand':
    '{{:#mainWithLabel}}(은)는 {{#peersWithLabels}}(과)와 동시에 존재할 수 없습니다.',
  'object.oxor':
    '{{#label}}(은)는 선택적 배타적 피어 {{#peersWithLabels}} 간의 충돌을 포함합니다.',
  'object.pattern.match': '{{#label}} 키가 패턴 요구 사항과 일치하지 않습니다.',
  'object.refType': '{{#label}}(은)는 Joi 참조여야 합니다.',
  'object.regex': '{{#label}}(은)는 정규식이여야 합니다.',
  'object.rename.multiple':
    '{{#label}}(은)는 다중 이름 바꾸기가 비활성화되어 있고 다른 키의 이름이 이미 {{:#to}}로 변경되었기 때문에 {{:#from}}의 이름을 바꿀 수 없습니다.',
  'object.rename.override':
    '재정의가 비활성화되어 있고 대상 {{:#to}}(이)가 존재하기 때문에 {{#label}}(은)는 {{:#from}}의 이름을 바꿀 수 없습니다.',
  'object.schema': '{{#label}}(은)는 유형의 Joi 스키마여야 합니다.',
  'object.unknown': '{{#label}}(은)는 허용되지 않습니다.',
  'object.with':
    '{{:#mainWithLabel}}에 필수 피어 {{:#peerWithLabel}}(이)가 없습니다.',
  'object.without':
    '금지된 피어 {{:#peerWithLabel}}(과)와 {{:#mainWithLabel}} 충돌이 있습니다.',
  'object.xor':
    '{{#label}}(이)의 배타적 피어인 {{#peersWithLabels}}간의 충돌이 있습니다.',
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
