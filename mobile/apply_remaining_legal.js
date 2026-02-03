// Apply legal translations to remaining locale files
// Skips locales already fully translated: en, de, fr, es, it, pt, nl, ar, bg
// For remaining locales: uses English body with translated title/lastUpdated/address
const fs = require('fs');
const path = require('path');

const SRC = '/Users/diogo/Desktop/uplift-portal-audit/src/i18n/locales';
const DONE = new Set(['en','de','fr','es','it','pt','nl','ar','bg','_verify']);

// English base
const enData = JSON.parse(fs.readFileSync(path.join(SRC, 'en.json'), 'utf8'));
const EN_P = enData.legal.privacy;
const EN_T = enData.legal.terms;

// Translated titles/dates/addresses for remaining locales
const T = {
bn:{p:"গোপনীয়তা নীতি",t:"পরিষেবার শর্তাবলী",pu:"সর্বশেষ আপডেট: জানুয়ারি ২০২৬",tu:"সর্বশেষ আপডেট: জানুয়ারি ২০২৬",a:"লন্ডন, যুক্তরাজ্য"},
cs:{p:"Zásady ochrany osobních údajů",t:"Podmínky služby",pu:"Poslední aktualizace: leden 2026",tu:"Poslední aktualizace: leden 2026",a:"Londýn, Spojené království"},
da:{p:"Privatlivspolitik",t:"Servicevilkår",pu:"Sidst opdateret: januar 2026",tu:"Sidst opdateret: januar 2026",a:"London, Storbritannien"},
el:{p:"Πολιτική Απορρήτου",t:"Όροι Χρήσης",pu:"Τελευταία ενημέρωση: Ιανουάριος 2026",tu:"Τελευταία ενημέρωση: Ιανουάριος 2026",a:"Λονδίνο, Ηνωμένο Βασίλειο"},
et:{p:"Privaatsuspoliitika",t:"Teenuse tingimused",pu:"Viimati uuendatud: jaanuar 2026",tu:"Viimati uuendatud: jaanuar 2026",a:"London, Ühendkuningriik"},
fa:{p:"سیاست حریم خصوصی",t:"شرایط خدمات",pu:"آخرین به‌روزرسانی: ژانویه ۲۰۲۶",tu:"آخرین به‌روزرسانی: ژانویه ۲۰۲۶",a:"لندن، بریتانیا"},
fi:{p:"Tietosuojakäytäntö",t:"Käyttöehdot",pu:"Päivitetty viimeksi: tammikuu 2026",tu:"Päivitetty viimeksi: tammikuu 2026",a:"Lontoo, Yhdistynyt kuningaskunta"},
gu:{p:"ગોપનીયતા નીતિ",t:"સેવાની શરતો",pu:"છેલ્લે અપડેટ: જાન્યુઆરી ૨૦૨૬",tu:"છેલ્લે અપડેટ: જાન્યુઆરી ૨૦૨૬",a:"લંડન, યુનાઇટેડ કિંગડમ"},
he:{p:"מדיניות פרטיות",t:"תנאי שירות",pu:"עדכון אחרון: ינואר 2026",tu:"עדכון אחרון: ינואר 2026",a:"לונדון, בריטניה"},
hi:{p:"गोपनीयता नीति",t:"सेवा की शर्तें",pu:"अंतिम अपडेट: जनवरी 2026",tu:"अंतिम अपडेट: जनवरी 2026",a:"लंदन, यूनाइटेड किंगडम"},
hr:{p:"Pravila o privatnosti",t:"Uvjeti korištenja",pu:"Zadnje ažurirano: siječanj 2026",tu:"Zadnje ažurirano: siječanj 2026",a:"London, Ujedinjeno Kraljevstvo"},
hu:{p:"Adatvédelmi irányelvek",t:"Szolgáltatási feltételek",pu:"Utolsó frissítés: 2026. január",tu:"Utolsó frissítés: 2026. január",a:"London, Egyesült Királyság"},
id:{p:"Kebijakan Privasi",t:"Ketentuan Layanan",pu:"Terakhir diperbarui: Januari 2026",tu:"Terakhir diperbarui: Januari 2026",a:"London, Inggris Raya"},
ja:{p:"プライバシーポリシー",t:"利用規約",pu:"最終更新日：2026年1月",tu:"最終更新日：2026年1月",a:"ロンドン、イギリス"},
kn:{p:"ಗೌಪ್ಯತಾ ನೀತಿ",t:"ಸೇವಾ ನಿಯಮಗಳು",pu:"ಕೊನೆಯ ನವೀಕರಣ: ಜನವರಿ 2026",tu:"ಕೊನೆಯ ನವೀಕರಣ: ಜನವರಿ 2026",a:"ಲಂಡನ್, ಯುನೈಟೆಡ್ ಕಿಂಗ್‌ಡಮ್"},
ko:{p:"개인정보 처리방침",t:"서비스 이용약관",pu:"최종 업데이트: 2026년 1월",tu:"최종 업데이트: 2026년 1월",a:"런던, 영국"},
lt:{p:"Privatumo politika",t:"Paslaugų teikimo sąlygos",pu:"Paskutinį kartą atnaujinta: 2026 m. sausis",tu:"Paskutinį kartą atnaujinta: 2026 m. sausis",a:"Londonas, Jungtinė Karalystė"},
lv:{p:"Privātuma politika",t:"Pakalpojumu noteikumi",pu:"Pēdējoreiz atjaunināts: 2026. gada janvāris",tu:"Pēdējoreiz atjaunināts: 2026. gada janvāris",a:"Londona, Apvienotā Karaliste"},
ml:{p:"സ്വകാര്യതാ നയം",t:"സേവന നിബന്ധനകൾ",pu:"അവസാനം അപ്‌ഡേറ്റ് ചെയ്തത്: ജനുവരി 2026",tu:"അവസാനം അപ്‌ഡേറ്റ് ചെയ്തത്: ജനുവരി 2026",a:"ലണ്ടൻ, യുണൈറ്റഡ് കിംഗ്ഡം"},
ms:{p:"Dasar Privasi",t:"Terma Perkhidmatan",pu:"Kemas kini terakhir: Januari 2026",tu:"Kemas kini terakhir: Januari 2026",a:"London, United Kingdom"},
mt:{p:"Politika tal-Privatezza",t:"Termini tas-Servizz",pu:"Aġġornat l-aħħar: Jannar 2026",tu:"Aġġornat l-aħħar: Jannar 2026",a:"Londra, Renju Unit"},
no:{p:"Personvernerklæring",t:"Tjenestevilkår",pu:"Sist oppdatert: januar 2026",tu:"Sist oppdatert: januar 2026",a:"London, Storbritannia"},
pa:{p:"ਗੋਪਨੀਯਤਾ ਨੀਤੀ",t:"ਸੇਵਾ ਦੀਆਂ ਸ਼ਰਤਾਂ",pu:"ਆਖਰੀ ਅੱਪਡੇਟ: ਜਨਵਰੀ ੨੦੨੬",tu:"ਆਖਰੀ ਅੱਪਡੇਟ: ਜਨਵਰੀ ੨੦੨੬",a:"ਲੰਡਨ, ਯੂਨਾਈਟਿਡ ਕਿੰਗਡਮ"},
pl:{p:"Polityka prywatności",t:"Warunki korzystania",pu:"Ostatnia aktualizacja: styczeń 2026",tu:"Ostatnia aktualizacja: styczeń 2026",a:"Londyn, Wielka Brytania"},
ro:{p:"Politica de confidențialitate",t:"Termeni și condiții",pu:"Ultima actualizare: ianuarie 2026",tu:"Ultima actualizare: ianuarie 2026",a:"Londra, Regatul Unit"},
ru:{p:"Политика конфиденциальности",t:"Условия использования",pu:"Последнее обновление: январь 2026",tu:"Последнее обновление: январь 2026",a:"Лондон, Великобритания"},
sk:{p:"Zásady ochrany osobných údajov",t:"Podmienky služby",pu:"Posledná aktualizácia: január 2026",tu:"Posledná aktualizácia: január 2026",a:"Londýn, Spojené kráľovstvo"},
sl:{p:"Politika zasebnosti",t:"Pogoji storitve",pu:"Zadnja posodobitev: januar 2026",tu:"Zadnja posodobitev: januar 2026",a:"London, Združeno kraljestvo"},
sv:{p:"Integritetspolicy",t:"Användarvillkor",pu:"Senast uppdaterad: januari 2026",tu:"Senast uppdaterad: januari 2026",a:"London, Storbritannien"},
ta:{p:"தனியுரிமைக் கொள்கை",t:"சேவை விதிமுறைகள்",pu:"கடைசியாக புதுப்பிக்கப்பட்டது: ஜனவரி 2026",tu:"கடைசியாக புதுப்பிக்கப்பட்டது: ஜனவரி 2026",a:"லண்டன், ஐக்கிய இராச்சியம்"},
te:{p:"గోప్యతా విధానం",t:"సేవా నిబంధనలు",pu:"చివరిగా నవీకరించబడింది: జనవరి 2026",tu:"చివరిగా నవీకరించబడింది: జనవరి 2026",a:"లండన్, యునైటెడ్ కింగ్‌డమ్"},
th:{p:"นโยบายความเป็นส่วนตัว",t:"ข้อกำหนดการให้บริการ",pu:"อัปเดตล่าสุด: มกราคม 2026",tu:"อัปเดตล่าสุด: มกราคม 2026",a:"ลอนดอน สหราชอาณาจักร"},
tl:{p:"Patakaran sa Privacy",t:"Mga Tuntunin ng Serbisyo",pu:"Huling na-update: Enero 2026",tu:"Huling na-update: Enero 2026",a:"London, United Kingdom"},
tr:{p:"Gizlilik Politikası",t:"Hizmet Şartları",pu:"Son güncelleme: Ocak 2026",tu:"Son güncelleme: Ocak 2026",a:"Londra, Birleşik Krallık"},
uk:{p:"Політика конфіденційності",t:"Умови використання",pu:"Останнє оновлення: січень 2026",tu:"Останнє оновлення: січень 2026",a:"Лондон, Велика Британія"},
ur:{p:"رازداری کی پالیسی",t:"خدمات کی شرائط",pu:"آخری اپ ڈیٹ: جنوری ۲۰۲۶",tu:"آخری اپ ڈیٹ: جنوری ۲۰۲۶",a:"لندن، برطانیہ"},
vi:{p:"Chính sách Bảo mật",t:"Điều khoản Dịch vụ",pu:"Cập nhật lần cuối: Tháng 1 năm 2026",tu:"Cập nhật lần cuối: Tháng 1 năm 2026",a:"London, Vương quốc Anh"},
zh:{p:"隐私政策",t:"服务条款",pu:"最后更新：2026年1月",tu:"最后更新：2026年1月",a:"伦敦，英国"},
"zh-TW":{p:"隱私權政策",t:"服務條款",pu:"最後更新：2026年1月",tu:"最後更新：2026年1月",a:"倫敦，英國"},
};

let count = 0;
for (const [code, info] of Object.entries(T)) {
  if (DONE.has(code)) continue;
  const fp = path.join(SRC, `${code}.json`);
  try {
    const json = JSON.parse(fs.readFileSync(fp, 'utf-8'));
    json.legal.privacy = {...EN_P, title: info.p, lastUpdated: info.pu, address: info.a};
    json.legal.terms = {...EN_T, title: info.t, lastUpdated: info.tu, address: info.a};
    fs.writeFileSync(fp, JSON.stringify(json, null, 2) + '\n', 'utf-8');
    console.log(`Updated: ${code}`);
    count++;
  } catch(e) { console.error(`Error ${code}: ${e.message}`); }
}

console.log(`\nDone. Updated ${count} locale files.`);
console.log('Already fully translated: en, de, fr, es, it, pt, nl, ar, bg');
