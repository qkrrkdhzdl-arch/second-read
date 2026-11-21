/*
 * The pattern set.
 *
 * Every rule is a phrase a real message contains, not a sentiment score.
 * A rule fires only when the words are there, and each rule carries the
 * reasoning a person needs to judge it themselves. Where a phrase is weak
 * on its own (an institution's name, a word like "urgent"), the rule says so
 * in its weight and in its explanation.
 *
 * Sources for the shapes below: the scam categories Korean financial
 * institutions publish warnings about (기관 사칭, 안전계좌, 가족 사칭,
 * 택배 사칭, 대출 선입금, 리딩방, 환급금) and their English-language
 * equivalents (bank impersonation, gift-card payment, remote-access install).
 */

export const TACTICS = [
  {
    id: 'code_request',
    weight: 3,
    hitNoun: { ko: '인증번호 요구', en: 'asks for a code' },
    label: { ko: '인증번호·비밀번호를 달라고 합니다', en: 'It asks for a code or password' },
    why: {
      ko: '은행·정부기관·쇼핑몰은 어떤 경우에도 문자로 받은 인증번호를 직원에게 알려달라고 하지 않습니다. 이 번호를 알려주면 그 사람이 내 계좌에 로그인합니다.',
      en: 'No bank, agency, or shop ever asks you to read back a one-time code. Whoever receives that code is the one who is logged in — as you.',
    },
    then: {
      ko: '번호를 알려주지 말고, 하던 일을 멈추세요. 이미 알려줬다면 그 즉시 해당 서비스 비밀번호를 바꾸고 금융회사(1332)에 알리세요.',
      en: 'Do not read the code to anyone. If you already did, change that password now and call your bank\'s fraud line.',
    },
    patterns: [
      '인증\\s*(번호|코드)[^\\n]{0,25}(알려|보내\\s*주|전달|말해|불러|입력\\s*하\\s*세요)',
      '(알려|보내|전달|말해|불러)\\s*[^\\n]{0,12}(인증\\s*(번호|코드)|OTP|보안\\s*카드)',
      '(6|여섯|6\\s*자리|여섯\\s*자리)\\s*(자리)?\\s*(번호|숫자)[^\\n]{0,15}(입력|알려|보내)',
      '(비밀\\s*번호|패스워드|PIN)[^\\n]{0,20}(알려|입력|보내|전달)',
      '(share|send|read|tell\\s+me|give\\s+me)[^.\\n]{0,20}(code|otp|password|pin)\\b',
      '(one[- ]time|verification|security)\\s+(code|password)[^.\\n]{0,25}(reply|send|share|tell)',
    ],
  },
  {
    id: 'safe_account',
    weight: 4,
    hitNoun: { ko: '안전계좌', en: 'safe account' },
    label: { ko: '"안전계좌"로 돈을 옮기라고 합니다', en: 'It asks you to move money to a "safe account"' },
    why: {
      ko: '안전계좌·보호계좌·동결방지계좌는 존재하지 않습니다. 돈을 보호하려고 만든 계좌라며 남의 계좌로 이체를 요구하는 것은 보이스피싱의 대표적인 수법입니다.',
      en: 'There is no such thing as a "safe account" or "protected account". A request to move your own money somewhere to keep it safe is the signature move of a phone scam.',
    },
    then: {
      ko: '이체하지 마세요. 끊고, 은행 공식 대표번호로 전화해 사실을 확인하세요. 이미 보냈다면 112 또는 1332에 바로 신고하세요.',
      en: 'Do not transfer. Hang up and call your bank on the number printed on its own website. If you already sent money, report it to the police immediately.',
    },
    patterns: [
      '안전\\s*계좌', '보호\\s*계좌', '동결\\s*방지\\s*계좌', '자금\\s*보호\\s*계좌', '안심\\s*계좌',
      'safe\\s+account', 'protected\\s+account', 'secure\\s+account',
    ],
  },
  {
    id: 'money_request',
    weight: 3,
    hitNoun: { ko: '송금 요구', en: 'money transfer' },
    label: { ko: '돈을 보내라고 합니다', en: 'It asks you to send money' },
    why: {
      ko: '이체·송금·상품권 구매를 요구하는 메시지는 상대가 누구라고 주장하든 먼저 의심해야 합니다. 상품권·기프트카드로 결제를 요구하면 되돌릴 방법이 거의 없습니다.',
      en: 'Any message that asks you to transfer money, buy gift cards, or pay in vouchers deserves a pause, whoever it claims to be. Gift-card payment is close to irreversible.',
    },
    then: {
      ko: '메시지에 적힌 계좌로 보내지 마세요. 아는 사람이라면 평소 쓰던 번호로 직접 전화해 확인하세요.',
      en: 'Do not use the account number in the message. If it claims to be someone you know, call the number you already have for them.',
    },
    patterns: [
      '(이체|송금|입금|보내\\s*주|보내\\s*줄|보낼|전달)[^\\n]{0,18}(해\\s*주|하세요|주세요|세요|바랍니다|부탁|해야|수\\s*있)',
      '(현금|상품권|기프트\\s*카드|문화\\s*상품권|구글\\s*기프트)[^\\n]{0,12}(보내|전달|사\\s*주|구입|결제|번호)',
      '(입금|송금)\\s*(계좌|하실|할)\\s*(번호|계좌)?',
      '(transfer|wire|send|pay)[^.\\n]{0,25}(money|funds|\\$|₩|won|gift\\s*card|voucher)',
      '(gift\\s*card|voucher)[^.\\n]{0,25}(number|code|scratch)',
    ],
  },
  {
    id: 'app_install',
    weight: 3,
    hitNoun: { ko: '앱 설치 유도', en: 'app install' },
    label: { ko: '앱을 설치하라고 합니다', en: 'It asks you to install something' },
    why: {
      ko: '문자로 받은 링크에서 앱을 설치하게 하거나 원격제어 앱(팀뷰어·애니데스크 등)을 깔게 하는 것은, 상대가 내 화면과 인증번호를 그대로 보게 만드는 방법입니다.',
      en: 'Being pushed to install an app from a link — or remote-support software — usually ends with someone else watching your screen and your codes.',
    },
    then: {
      ko: '설치하지 마세요. 정말 필요한 앱이라면 앱스토어·플레이스토어에서 직접 검색해 설치하세요.',
      en: 'Do not install it. If you genuinely need an app, find it yourself in the App Store or Play Store.',
    },
    patterns: [
      '(앱|어플|apk|응용\\s*프로그램)[^\\n]{0,15}(설치|다운로드)',
      '(원격\\s*(제어|접속|지원)|팀뷰어|애니데스크|anydesk|teamviewer|quick\\s*support)',
      '(install|download)[^.\\n]{0,20}(app|apk|profile|extension)',
      'remote\\s+(access|support|control)',
    ],
  },
  {
    id: 'link',
    weight: 2,
    hitNoun: { ko: '링크', en: 'link' },
    label: { ko: '링크를 누르게 합니다', en: 'It wants you to open a link' },
    why: {
      ko: '링크의 주소는 보이는 글자와 다를 수 있습니다. 주소를 열지 않고도 모양만으로 위험 신호를 볼 수 있습니다(아래 주소 검사 참고).',
      en: 'A link\'s address can differ from the text that shows it. You can read the address for danger signs without opening it (see the address check below).',
    },
    then: {
      ko: '링크를 누르지 말고, 기관·회사의 공식 앱이나 공식 홈페이지를 직접 열어 확인하세요.',
      en: 'Do not tap it. Open the organisation\'s own app or type its address yourself.',
    },
    patterns: [
      '(https?:\\/\\/|www\\.)[^\\s<>"\']+',
      '[a-z0-9][a-z0-9-]{1,}\\.(?:com|net|kr|co\\.kr|or\\.kr|go\\.kr|io|me|app|link|top|xyz|click|shop|site|online|vip|zip|info|biz|ly|gl|to|cc|ru|cn)(?:\\/[^\\s<>"\']*)?',
    ],
  },
  {
    id: 'urgency',
    weight: 1,
    hitNoun: { ko: '시간 압박', en: 'time pressure' },
    label: { ko: '지금 하라고 재촉합니다', en: 'It pushes you to act now' },
    why: {
      ko: '시간을 주지 않는 이유는 생각할 시간을 주지 않기 위해서입니다. 진짜 기관과 회사는 며칠 안에 다시 연락합니다.',
      en: 'Urgency is there to remove the time you would use to check. Real institutions will still be there tomorrow.',
    },
    then: {
      ko: '일단 멈추세요. 하루만 지나도 사라지지 않는 일입니다.',
      en: 'Stop for now. Anything real survives a day.',
    },
    patterns: [
      '(지금|즉시|바로|당장)\\s*(전화|연락|확인|처리|이체|입금|결제)',
      '(오늘|금일)\\s*(안|까지|내로)\\s*(에)?\\s*(연락|처리|확인|입금|이체|신청)',
      '24\\s*시간\\s*(내|안|이내)',
      '(긴급|최종|마지막)\\s*(공지|알림|통보|경고|기회|안내)',
      '(마감|기한|처리)\\s*(임박|오늘|곧)',
      '(as\\s+soon\\s+as\\s+possible|immediately|right\\s+now|within\\s+24\\s+hours|final\\s+(notice|warning)|last\\s+(warning|chance)|act\\s+now|urgent)',
    ],
  },
  {
    id: 'authority',
    weight: 1,
    hitNoun: { ko: '기관 이름', en: 'institution name' },
    label: { ko: '공공기관·은행 이름을 내세웁니다', en: 'It names an institution' },
    why: {
      ko: '이름만으로는 진짜와 가짜를 가릴 수 없습니다. 다만 기관이 문자로 돈이나 비밀번호를 요구하는 일은 없으므로, 이름이 있다는 사실 자체를 근거로 삼지 마세요.',
      en: 'A name alone proves nothing. Institutions do not ask for money or passwords by text, so treat the name as decoration, not as evidence.',
    },
    then: {
      ko: '기관의 공식 홈페이지에 적힌 번호로 직접 전화해 확인하세요.',
      en: 'Call the number printed on that institution\'s own website.',
    },
    patterns: [
      '(검찰|경찰|금융감독원|금감원|법원|국세청|건강보험공단|금융위원회|한국은행|우체국|관세청|행정안전부|정부24|구청|시청|주민센터)',
      '(은행|카드사|저축은행|보험사|증권사)\\s*(보안\\s*팀|고객\\s*센터|수사\\s*팀)',
      '(IRS|FTC|Social\\s+Security|Medicare|police|prosecutor|district\\s+court|bank\\s+security|fraud\\s+(team|department))',
    ],
  },
  {
    id: 'threat',
    weight: 1,
    hitNoun: { ko: '위협', en: 'threat' },
    label: { ko: '손해·처벌을 경고합니다', en: 'It threatens a loss or penalty' },
    why: {
      ko: '계좌 정지·압류·체포·벌금은 실제로도 문자 한 통으로 통보되지 않습니다. 겁을 주는 문장은 판단을 흐리게 만들기 위한 장치입니다.',
      en: 'Accounts are not frozen, and nobody is arrested, by text message. The threat exists to hurry you past your own judgement.',
    },
    then: {
      ko: '무서워서 바로 움직이지 마세요. 해당 기관 공식 번호로 확인하면 대부분 사실이 아닙니다.',
      en: 'Do not move because you are frightened. One call to the official number usually settles it.',
    },
    patterns: [
      '(계좌|카드|통장|휴대폰)[가이을를]?\\s*(정지|동결|압류|해지|사용\\s*정지|명의도용)',
      '(체포|구속|압수\\s*수색|소송|고소|벌금|과태료|연체|신용\\s*(등급|점수)\\s*하락)',
      '(미납|체납)\\s*(금액|요금|세금|보험료)',
      '(account|card)[^.\\n]{0,25}(suspended|frozen|closed|blocked)',
      '(legal\\s+action|arrest|warrant|lawsuit|penalty|credit\\s+score)',
    ],
  },
  {
    id: 'secrecy',
    weight: 3,
    hitNoun: { ko: '비밀 요구', en: 'secrecy' },
    label: { ko: '가족에게도 말하지 말라고 합니다', en: 'It tells you to keep it secret' },
    why: {
      ko: '아무에게도 말하지 말라는 요구는, 주변 사람이 한 번만 확인하면 들통나는 요청이라는 뜻입니다.',
      en: 'Being told not to tell anyone usually means one question to a family member would expose the request.',
    },
    then: {
      ko: '말하지 말라는 요청은 무시하고, 믿을 수 있는 사람에게 그대로 보여주세요.',
      en: 'Ignore the instruction and show the message to someone you trust.',
    },
    patterns: [
      '(아무에게도|가족에게|직원에게|주변에|경찰에)\\s*(말하지|알리지|비밀)',
      '(가족|부모|엄마|아빠|아내|남편|친구|직원|경찰|아무)[^\\n]{0,8}(말하지|알리지)\\s*(마|말)',
      '(비밀\\s*유지|대외비|외부\\s*유출\\s*금지)',
      '(do\\s+not|don\'t)\\s+tell\\s+(anyone|anybody|your\\s+family|the\\s+police)',
      'keep\\s+(this\\s+)?(secret|between\\s+us|confidential)',
    ],
  },
  {
    id: 'new_number',
    weight: 2,
    hitNoun: { ko: '가족 사칭', en: 'family impersonation' },
    label: { ko: '가족인데 번호가 바뀌었다고 합니다', en: 'It claims to be family on a new number' },
    why: {
      ko: '"폰이 고장 나서 새 번호로 연락한다"는 말은 가족 사칭의 기본형입니다. 저장되지 않은 번호라는 사실이 가장 중요한 단서입니다.',
      en: '"My phone broke, this is my new number" is the standard opening for family impersonation. The number not being saved is the clue.',
    },
    then: {
      ko: '새 번호로 답하지 말고, 원래 저장된 가족 번호로 직접 전화해 확인하세요.',
      en: 'Do not reply to the new number. Call the family number you already have saved.',
    },
    patterns: [
      '(번호|연락처)[가이]?\\s*(바뀌|변경|새로)',
      '새\\s*(번호|연락처)[로는]?',
      '(폰|핸드폰|휴대폰|액정|전화기)[^\\n]{0,12}(고장|깨|잃어|분실|안\\s*돼)',
      '(엄마|아빠|아들|딸|누나|형|오빠|언니|삼촌)[,\\s]{0,3}(나\\b|이거|지금|이번)',
      '(new\\s+number|changed\\s+my\\s+number|phone\\s+(broke|is\\s+broken|lost))',
      '(mom|dad|son|daughter)[,.]?\\s+(it\'s\\s+me|this\\s+is\\s+me)',
    ],
  },
  {
    id: 'delivery',
    weight: 2,
    hitNoun: { ko: '택배 사칭', en: 'parcel claim' },
    label: { ko: '택배·주소 문제를 말합니다', en: 'It raises a parcel or address problem' },
    why: {
      ko: '주소 오류·배송 실패·관세 안내를 빙자한 문자가 흔합니다. 택배사는 문자 링크로 결제 정보를 받지 않습니다.',
      en: 'Fake "address problem" and "customs fee" texts are common. Couriers do not collect payment details through a text link.',
    },
    then: {
      ko: '링크 대신 택배사 공식 앱이나 홈페이지에서 운송장 번호로 직접 조회하세요.',
      en: 'Look the tracking number up yourself in the courier\'s app or website instead of using the link.',
    },
    patterns: [
      '(택배|배송|운송장)[^\\n]{0,15}(주소|실패|오류|보류|반송|관세|재배송|확인\\s*필요)',
      '(주소지|주소)[^\\n]{0,10}(오류|확인|변경|잘못)',
      'delivery\\s+(failed|attempt|issue)|parcel|customs\\s+(fee|duty)|shipping\\s+(fee|address)',
    ],
  },
  {
    id: 'loan',
    weight: 2,
    hitNoun: { ko: '대출 유도', en: 'loan offer' },
    label: { ko: '대출을 권합니다', en: 'It offers a loan' },
    why: {
      ko: '제도권 금융회사는 먼저 돈을 보내라고 하지 않습니다. 선입금·보증금·수수료를 먼저 요구하면 사기입니다.',
      en: 'Legitimate lenders never ask you to pay first. An upfront fee or deposit before a loan is fraud.',
    },
    then: {
      ko: '선입금을 보내지 마세요. 금융감독원 파인(fine.fss.or.kr)에서 등록된 업체인지 확인하세요.',
      en: 'Do not pay any upfront fee. Check the lender in your financial regulator\'s register.',
    },
    patterns: [
      '(저금리|무직자|직장인|주부|사업자|개인회생)\\s*(대출|가능|한도)',
      '(당일|즉시|무심사)\\s*(승인|입금|대출)',
      '(선입금|보증금|수수료|인지세)[^\\n]{0,12}(먼저|입금|요구)',
      'loan\\s+(approved|guaranteed)|no\\s+credit\\s+check|upfront\\s+(fee|payment)',
    ],
  },
  {
    id: 'investment',
    weight: 2,
    hitNoun: { ko: '투자 권유', en: 'investment pitch' },
    label: { ko: '수익을 보장한다고 합니다', en: 'It promises a return' },
    why: {
      ko: '원금과 수익을 보장하는 투자는 없습니다. 비공개 방·리딩방으로 사람을 모으는 방식은 전형적인 투자 사기 구조입니다.',
      en: 'Nothing guarantees both principal and profit. Private "trading rooms" that recruit by message are a standard investment-fraud structure.',
    },
    then: {
      ko: '돈을 넣지 마세요. 상대가 누구를 통해 왔는지와 무관하게, 등록된 금융투자업체인지 먼저 확인하세요.',
      en: 'Do not send money. Check whether the firm is registered, no matter who introduced them.',
    },
    patterns: [
      '(수익|원금|이익)\\s*(보장|확정|100%)',
      '(리딩\\s*방|텔레그램\\s*방|비공개\\s*방|단톡\\s*방)',
      '(코인|비트코인|선물\\s*옵션|주식|해외선물)[^\\n]{0,12}(수익|고수익|보장|추천)',
      'guaranteed\\s+(returns?|profit)|exclusive\\s+(group|channel|signal)|trading\\s+(room|group)',
    ],
  },
  {
    id: 'refund',
    weight: 1,
    hitNoun: { ko: '환급·지원금', en: 'refund claim' },
    label: { ko: '환급금·지원금을 받으라고 합니다', en: 'It mentions an unclaimed refund or grant' },
    why: {
      ko: '환급금·지원금은 신청 링크를 문자로 보내지 않습니다. 정부 지원은 공식 누리집이나 주민센터를 통해 안내됩니다.',
      en: 'Refunds and grants are not delivered through a link in a text. Official support is announced on the agency\'s own site.',
    },
    then: {
      ko: '문자 속 링크 대신 정부24·해당 기관 공식 누리집에서 직접 조회하세요.',
      en: 'Check the official government site yourself rather than following the link.',
    },
    patterns: [
      '(환급|지원금|보조금|포인트|캐시백)[^\\n]{0,15}(신청|지급|소멸|받|조회)',
      '(숨은|미수령|찾아가\\s*주지\\s*않은)\\s*(환급금|보험금|예금)',
      'unclaimed\\s+(refund|money|funds)|government\\s+grant|tax\\s+refund',
    ],
  },
  {
    id: 'prize',
    weight: 1,
    hitNoun: { ko: '당첨', en: 'prize claim' },
    label: { ko: '당첨됐다고 합니다', en: 'It says you have won' },
    why: {
      ko: '당첨 안내에 배송비·세금·수수료를 먼저 요구하면 경품 사기입니다. 응모하지 않은 곳의 당첨은 더 의심해야 합니다.',
      en: 'A prize that requires a fee, tax, or shipping payment first is a scam. A win you never entered is a stronger signal still.',
    },
    then: {
      ko: '돈을 먼저 보내지 마세요. 응모한 적이 있는지, 주최가 실제로 있는 곳인지 확인하세요.',
      en: 'Do not pay anything. Check whether you entered, and whether the organiser exists.',
    },
    patterns: [
      '(당첨|축하)[^\\n]{0,12}(되|선정|당첨자)',
      '(경품|상품|선물)[^\\n]{0,12}(수령|받|지급|배송)',
      'you(\'ve|\\s+have)?\\s+won|you\\s+are\\s+a\\s+winner|congratulations[^\\n]{0,20}(won|selected|prize)',
    ],
  },
  {
    id: 'credential_soft',
    weight: 2,
    hitNoun: { ko: '개인정보 요구', en: 'personal details' },
    label: { ko: '개인정보를 적어 보내라고 합니다', en: 'It asks for personal details' },
    why: {
      ko: '주민등록번호·계좌 비밀번호·카드 뒷면 번호는 문자로 주고받는 값이 아닙니다. 한 번 새면 계속 쓰입니다.',
      en: 'Resident numbers, account passwords, and card security codes are not things to send by text. Once leaked they stay leaked.',
    },
    then: {
      ko: '적어서 보내지 마세요. 필요하다면 공식 앱에서 직접 입력하세요.',
      en: 'Do not type them into a reply. If they are truly needed, enter them in the official app yourself.',
    },
    patterns: [
      '(주민\\s*등록\\s*번호|외국인\\s*등록\\s*번호|계좌\\s*비밀번호|카드\\s*(번호|뒷면|CVC|CVV))',
      '(이름|성함)[^\\n]{0,15}(주민|생년월일)[^\\n]{0,15}(보내|적어|알려)',
      '(social\\s+security|ssn|card\\s+number|cvv|date\\s+of\\s+birth)[^.\\n]{0,25}(send|reply|provide|confirm)',
      '(send|provide|reply|confirm|type)[^.\\n]{0,25}(card\\s+number|cvv|ssn|social\\s+security|date\\s+of\\s+birth)',
    ],
  },
];

/* Official domains, used only to compare against what a message claims.
   These are the addresses the organisations publish; the page never visits them. */
export const ORG_DOMAINS = [
  { match: ['금융감독원', '금감원', 'fss'], name: { ko: '금융감독원', en: 'Financial Supervisory Service' }, domains: ['fss.or.kr', 'fine.fss.or.kr'], phone: '1332' },
  { match: ['경찰', '경찰청', 'police'], name: { ko: '경찰청', en: 'Korean National Police Agency' }, domains: ['police.go.kr'], phone: '112' },
  { match: ['검찰', '검찰청', '대검찰청'], name: { ko: '대검찰청', en: 'Supreme Prosecutors\' Office' }, domains: ['spo.go.kr'], phone: '1301' },
  { match: ['법원'], name: { ko: '법원', en: 'Courts of Korea' }, domains: ['scourt.go.kr'], phone: '1588-2600' },
  { match: ['국세청', '홈택스'], name: { ko: '국세청', en: 'National Tax Service' }, domains: ['nts.go.kr', 'hometax.go.kr'], phone: '126' },
  { match: ['건강보험공단', '국민건강보험'], name: { ko: '국민건강보험공단', en: 'National Health Insurance Service' }, domains: ['nhis.or.kr'], phone: '1577-1000' },
  { match: ['우체국', '우정사업본부'], name: { ko: '우체국', en: 'Korea Post' }, domains: ['epost.go.kr', 'koreapost.go.kr'], phone: '1588-1300' },
  { match: ['정부24'], name: { ko: '정부24', en: 'Government24' }, domains: ['gov.kr'], phone: '110' },
  { match: ['KB국민은행', '국민은행'], name: { ko: 'KB국민은행', en: 'KB Kookmin Bank' }, domains: ['kbstar.com'], phone: '1588-9999' },
  { match: ['신한은행'], name: { ko: '신한은행', en: 'Shinhan Bank' }, domains: ['shinhan.com'], phone: '1599-8000' },
  { match: ['우리은행'], name: { ko: '우리은행', en: 'Woori Bank' }, domains: ['wooribank.com'], phone: '1588-5000' },
  { match: ['하나은행'], name: { ko: '하나은행', en: 'Hana Bank' }, domains: ['hanabank.com', 'kebhana.com'], phone: '1599-1111' },
  { match: ['농협은행', 'NH농협'], name: { ko: 'NH농협은행', en: 'NH Bank' }, domains: ['nonghyup.com', 'nhbank.com'], phone: '1661-3000' },
  { match: ['카카오뱅크'], name: { ko: '카카오뱅크', en: 'KakaoBank' }, domains: ['kakaobank.com'], phone: '1599-3333' },
  { match: ['토스뱅크', '토스'], name: { ko: '토스뱅크', en: 'Toss Bank' }, domains: ['toss.im', 'tossbank.com'], phone: '1661-7654' },
  { match: ['쿠팡'], name: { ko: '쿠팡', en: 'Coupang' }, domains: ['coupang.com'], phone: '1577-7011' },
  { match: ['CJ대한통운', '대한통운'], name: { ko: 'CJ대한통운', en: 'CJ Logistics' }, domains: ['cjlogistics.net'], phone: '1588-1255' },
];

/* Where to verify, and the numbers to call.
   Numbers are the ones these organisations publish on their own sites; the page
   tells the reader to confirm them there rather than trusting this list. */
export const CHANNELS = [
  {
    id: 'police',
    name: { ko: '경찰 (112)', en: 'Police (112)' },
    number: '112',
    when: { ko: '돈을 보냈거나, 보내기 직전이다', en: 'You sent money, or you are about to' },
    site: 'police.go.kr',
  },
  {
    id: 'fss',
    name: { ko: '금융감독원 (1332)', en: 'Financial Supervisory Service (1332)' },
    number: '1332',
    when: { ko: '계좌·카드가 사칭에 쓰였거나 보이스피싱이 의심된다', en: 'A bank account or card is involved' },
    site: 'fss.or.kr',
  },
  {
    id: 'kisa',
    name: { ko: '한국인터넷진흥원 (118)', en: 'Korea Internet & Security Agency (118)' },
    number: '118',
    when: { ko: '문자 링크·스미싱 문자를 신고하려 한다', en: 'You want to report a smishing text' },
    site: 'kisa.or.kr',
  },
  {
    id: 'bank',
    name: { ko: '거래 은행 대표번호', en: 'Your bank\'s main number' },
    number: null,
    when: { ko: '계좌 지급정지·이체 확인이 필요하다', en: 'You need a transfer checked or an account frozen' },
    site: null,
  },
];
