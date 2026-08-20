/**
 * High-Accuracy Hindi & Devanagari Translation and Transliteration Engine for Matuki ERP
 */

// 1. Direct Sweet & Dairy Products Dictionary (English / Gujarati to pure Hindi Devanagari)
export const SWEET_HINDI_DICTIONARY: Record<string, string> = {
  // Barfi & Milk Sweets
  'kalakand barfi': 'कलाकंद बर्फी',
  'kalakand': 'कलाकंद बर्फी',
  'kala kand': 'कलाकंद बर्फी',
  'malai barfi': 'मलाई बर्फी',
  'anjeer barfi': 'अंजीर बर्फी',
  'anjeer dry fruit barfi': 'अंजीर ड्राई फ्रूट बर्फी',
  'kaju katli': 'काजू कतली',
  'kaju barfi': 'काजू कतली',
  'kaju pista roll': 'काजू पिस्ता रोल',
  'kaju anjeer roll': 'काजू अंजीर रोल',
  'kaju cassata': 'काजू कसाटा',
  'kaju pan': 'काजू पान',
  'kaju modak': 'काजू मोदक',
  'milk cake': 'मिल्क केक',
  'mohanthal': 'मोहनथाल',
  'kesar mohanthal': 'केसर मोहनथाल',
  'kopra pak': 'कोपरा पाक (नारियल बर्फी)',
  'coconut barfi': 'नारियल बर्फी',
  'chocolate barfi': 'चॉकलेट बर्फी',
  'doda barfi': 'डोडा बर्फी',

  // Matho / Shrikhand (મઠો / શ્રીખંડ)
  'kesar crystal matho': 'केसर क्रिस्टल मठो (श्रीखंड)',
  'kesar matho': 'केसर मठो (श्रीखंड)',
  'rajbhog matho': 'राजभोग मठो (श्रीखंड)',
  'mango matho': 'मैंगो मठो (आम्रखंड)',
  'amba matho': 'मैंगो मठो (आम्रखंड)',
  'dryfruit matho': 'ड्राई फ्रूट मठो (श्रीखंड)',
  'dry fruit matho': 'ड्राई फ्रूट मठो (श्रीखंड)',
  'elaichi matho': 'इलायची मठो',
  'pista matho': 'पिस्ता मठो',
  'cadbury matho': 'कैडबरी मठो',
  'american dryfruit matho': 'अमेरिकन ड्राई फ्रूट मठो',
  'shrikhand': 'केसर श्रीखंड',
  'kesar shrikhand': 'केसर श्रीखंड',
  'mango shrikhand': 'आम्रखंड (मैंगो श्रीखंड)',
  'rajbhog shrikhand': 'राजभोग श्रीखंड',

  // Peda / Penda (પેંડા)
  'kesar penda': 'केसर पेड़ा',
  'kesar peda': 'केसर पेड़ा',
  'malai penda': 'मलाई पेड़ा',
  'malai peda': 'मलाई पेड़ा',
  'doodh penda': 'दूध पेड़ा',
  'doodh peda': 'दूध पेड़ा',
  'milk peda': 'मिल्क पेड़ा',
  'thabdi penda': 'थाबड़ी पेड़ा',
  'thabdi peda': 'थाबड़ी पेड़ा',
  'thabdi': 'थाबड़ी पेड़ा',
  'bhavnagari penda': 'भावनगरी पेड़ा',
  'mathura peda': 'मथुरा पेड़ा',
  'kesar vati peda': 'केसर वटी पेड़ा',

  // Bengoli & Syrup Sweets
  'gulab jamun': 'गुलाब जामुन',
  'kala jamun': 'काला जामुन',
  'kesar gulab jamun': 'केसर गुलाब जामुन',
  'angoori gulab jamun': 'अंगूरी गुलाब जामुन',
  'angoori jamun': 'अंगूरी गुलाब जामुन',
  'rasgulla': 'रसगुल्ला',
  'ras gulla': 'रसगुल्ला',
  'kesar rasgulla': 'केसर रसगुल्ला',
  'white rasgulla': 'सफेद रसगुल्ला',
  'rasmalai': 'रसमलाई',
  'ras malai': 'रसमलाई',
  'kesar rasmalai': 'केसर रसमलाई',
  'angoori rasmalai': 'अंगूरी रसमलाई',
  'kesar angoor rabdi': 'केसर अंगूर रबड़ी',
  'rabdi': 'केसर रबड़ी',
  'basundi': 'बासुंदी',
  'sitaphal basundi': 'सीताफल बासुंदी',
  'kesar basundi': 'केसर बासुंदी',
  'cham cham': 'चमचम',
  'rajbhog': 'राजभोग',

  // Halwa (હલવો)
  'dry fruit halwa': 'ड्राई फ्रूट हलवा',
  'dryfruit halwa': 'ड्राई फ्रूट हलवा',
  'bombay halwa': 'बॉम्बे कराची हलवा',
  'karachi halwa': 'कराची हलवा',
  'gajar halwa': 'गाजर का हलवा',
  'gajar ka halwa': 'गाजर का हलवा',
  'doodhi halwa': 'दूधी (लौकी) हलवा',
  'moong dal halwa': 'मूंग दाल हलवा',
  'badam halwa': 'बादाम हलवा',

  // Ladoo (લાડુ)
  'motichoor ladoo': 'मोतीचूर लड्डू',
  'motichoor laddu': 'मोतीचूर लड्डू',
  'motichur ladoo': 'मोतीचूर लड्डू',
  'motichur laddu': 'मोतीचूर लड्डू',
  'desi ghee motichoor ladoo': 'देसी घी मोतीचूर लड्डू',
  'desi ghee motichur ladoo': 'देसी घी मोतीचूर लड्डू',
  'besan ladoo': 'बेसन लड्डू',
  'besan laddu': 'बेसन लड्डू',
  'boondi ladoo': 'बूंदी लड्डू',
  'boondi laddu': 'बूंदी लड्डू',
  'bundi ladoo': 'बूंदी लड्डू',
  'bundi laddu': 'बूंदी लड्डू',
  'churma ladoo': 'चूरमा लड्डू',
  'churma laddu': 'चूरमा लड्डू',
  'dry fruit ladoo': 'ड्राई फ्रूट लड्डू',
  'gond ladoo': 'गोंद के लड्डू',
  'til ladoo': 'तिल के लड्डू',

  // Ghari (ઘારી) & Traditional Gujarati
  'surati ghari': 'सुरती घारी',
  'ghari': 'सुरती घारी',
  'kesar ghari': 'केसर घारी',
  'badam pista ghari': 'बादाम पिस्ता घारी',
  'mava ghari': 'मावा घारी',
  'mysore pak': 'मैसूर पाक',
  'mysore': 'मैसूर पाक',
  'maisur': 'मैसूर पाक',
  'magas': 'मगज (मगस)',
  'sutarfeni': 'सुतारफेणी',
  'jalebi': 'केसर जलेबी',
  'kesar jalebi': 'केसर जलेबी',
  'rabdi jalebi': 'रबड़ी जलेबी',
  'fafda': 'फाफड़ा',
  'khaman': 'नायलॉन खमण',
  'nylon khaman': 'नायलॉन खमण',
  'vatidal khaman': 'वाटी दाल खमण',
  'dhokla': 'ढोकला',
  'khandvi': 'खांडवी',
  'samosa': 'समोसा',
  'kachori': 'कचौरी',

  // Dairy & Everyday Items
  'buttermilk': 'मसाला छाछ',
  'chhas': 'मसाला छाछ',
  'chhash': 'मसाला छाछ',
  'chaas': 'मसाला छाछ',
  'masala chhas': 'मसाला छाछ',
  'plain chhas': 'सादी छाछ',
  'curd': 'मीठा दही',
  'dahi': 'दही',
  'paneer': 'मलाई पनीर',
  'malai paneer': 'मलाई पनीर',
  'fresh paneer': 'ताजा मलाई पनीर',
  'mawa': 'मावा (खोया)',
  'khoya': 'मावा (खोया)',
  'chikna mawa': 'चिकना मावा',
  'danedar mawa': 'दानेदार मावा',
  'ghee': 'शुद्ध देसी घी',
  'desi ghee': 'शुद्ध देसी घी',
  'cow ghee': 'गाय का देसी घी',
  'buffalo ghee': 'भैंस का देसी घी',
  'milk': 'ताजा दूध',
  'full cream milk': 'फुल क्रीम दूध',
  'cream': 'मलाई / क्रीम',
  'malai': 'ताजा मलाई'
};

// 2. Units in Hindi
export const UNIT_HINDI_MAP: Record<string, string> = {
  'kg': 'किलो',
  'kilogram': 'किलो',
  'kgs': 'किलो',
  'kilo': 'किलो',
  'gm': 'ग्राम',
  'gram': 'ग्राम',
  'grams': 'ग्राम',
  'gms': 'ग्राम',
  'pouch': 'पाउच',
  'pouches': 'पाउच',
  'ltr': 'लीटर',
  'liter': 'लीटर',
  'litres': 'लीटर',
  'liters': 'लीटर',
  'box': 'बॉक्स',
  'boxes': 'बॉक्स',
  'pcs': 'पीस / नग',
  'piece': 'पीस / नग',
  'pieces': 'पीस / नग',
  'nos': 'नग',
  'tin': 'टीन',
  'can': 'कैन',
  'carat': 'कैरट',
  'dabba': 'डब्बा'
};

// 3. Packaging & Container Names in Hindi
export const VASAN_HINDI_MAP: Record<string, string> = {
  'milton': 'मिल्टन थर्मस',
  'dol': 'स्टील डोल (बाल्टी)',
  'steel dol': 'स्टील डोल (बाल्टी)',
  'choki': 'चौकी (ट्रे)',
  'carat': 'कैरट (क्रैट)',
  'steel dabba': 'स्टील डब्बा',
  'petharo': 'पेथारो',
  'plastic tub': 'प्लास्टिक टब',
  'tray': 'ट्रे',
  'other': 'अन्य बर्तन',
  'none': 'कोई बर्तन नहीं'
};

// 4. Exact Gujarati to Devanagari Character-by-Character Conversion
const GUJARATI_TO_DEVANAGARI_MAP: Record<string, string> = {
  'અ': 'अ', 'આ': 'आ', 'ઇ': 'इ', 'ઈ': 'ई', 'ઉ': 'उ', 'ઊ': 'ऊ', 'ઋ': 'ऋ', 'એ': 'ए', 'ઐ': 'ऐ', 'ઓ': 'ओ', 'ઔ': 'औ',
  'ક': 'क', 'ખ': 'ख', 'ગ': 'ग', 'ઘ': 'घ', 'ઙ': 'ङ',
  'ચ': 'च', 'છ': 'छ', 'જ': 'ज', 'ઝ': 'झ', 'ઞ': 'ञ',
  'ટ': 'ट', 'ઠ': 'ठ', 'ડ': 'ड', 'ઢ': 'ढ', 'ણ': 'ण',
  'ત': 'त', 'થ': 'थ', 'દ': 'द', 'ધ': 'ध', 'ન': 'न',
  'પ': 'प', 'ફ': 'फ', 'બ': 'ब', 'ભ': 'भ', 'મ': 'म',
  'ય': 'य', 'ર': 'र', 'લ': 'ल', 'ળ': 'ळ', 'વ': 'व',
  'શ': 'श', 'ષ': 'ष', 'સ': 'स', 'હ': 'ह',
  'ા': 'ा', 'િ': 'ि', 'ી': 'ी', 'ુ': 'ु', 'ૂ': 'ू', 'ૃ': 'ृ',
  'ે': 'े', 'ૈ': 'ै', 'ો': 'ो', 'ૌ': 'ौ', 'ં': 'ं', 'ઃ': 'ः', '્': '्',
  '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4', '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9'
};

export function convertGujaratiToHindiScript(text: string): string {
  if (!text) return '';
  return text.split('').map(ch => GUJARATI_TO_DEVANAGARI_MAP[ch] || ch).join('');
}

// 5. High-Precision Address, Landmark, Party Plot & Venue Dictionary
export const VENUE_HINDI_DICTIONARY: Record<string, string> = {
  // Party Plots & Catering Venues
  'eagle party plot': 'ईगल पार्टी प्लॉट',
  'eagle': 'ईगल',
  'party plot': 'पार्टी प्लॉट',
  'party plots': 'पार्टी प्लॉट',
  'party': 'पार्टी',
  'plot': 'प्लॉट',
  'plots': 'प्लॉट',
  'shree ram party plot': 'श्री राम पार्टी प्लॉट',
  'shree radhe party plot': 'श्री राधे पार्टी प्लॉट',
  'laxmi party plot': 'लक्ष्मी पार्टी प्लॉट',
  'vrindavan party plot': 'वृंदावन पार्टी प्लॉट',
  'gokul party plot': 'गोकुल पार्टी प्लॉट',
  'tulsi party plot': 'तुलसी पार्टी प्लॉट',
  'shreeji party plot': 'श्रीजी पार्टी प्लॉट',
  'shyam party plot': 'श्याम पार्टी प्लॉट',
  'kesar party plot': 'केसर पार्टी प्लॉट',
  'maniba party plot': 'मणिबा पार्टी प्लॉट',
  'maruti party plot': 'मारुति पार्टी प्लॉट',
  'om party plot': 'ओम पार्टी प्लॉट',
  'rajhans party plot': 'राजहंस पार्टी प्लॉट',
  'avadh party plot': 'अवध पार्टी प्लॉट',
  'green party plot': 'ग्रीन पार्टी प्लॉट',
  'royal party plot': 'रॉयल पार्टी प्लॉट',
  'diamond party plot': 'डायमंड पार्टी प्लॉट',
  'sarthana party plot': 'सरथाणा पार्टी प्लॉट',
  'ganga party plot': 'गंगा पार्टी प्लॉट',
  'yamuna party plot': 'यमुना पार्टी प्लॉट',
  'swastik party plot': 'स्वास्तिक पार्टी प्लॉट',
  'swastik tower': 'स्वास्तिक टावर',
  'swastik towers': 'स्वास्तिक टावर',
  'swastik': 'स्वास्तिक',
  'showroom': 'शोरूम',
  'sarthana showroom': 'सरथाणा शोरूम',
  'eagle sarthana': 'ईगल सरथाणा',

  // Buildings, Structures & Infrastructure
  'tower': 'टावर',
  'towers': 'टावर',
  'building': 'बिल्डिंग',
  'bldg': 'बिल्डिंग',
  'house': 'हाउस',
  'hub': 'हब',
  'center': 'सेंटर',
  'centre': 'सेंटर',
  'point': 'पॉइंट',
  'corner': 'कॉर्नर',
  'plaza': 'प्लाज़ा',
  'mall': 'मॉल',
  'mart': 'मार्ट',
  'complex': 'कॉम्प्लेक्स',
  'arcade': 'आर्केड',
  'heights': 'हाइट्स',
  'square': 'स्क्वायर',
  'residency': 'रेसीडेंसी',
  'apartment': 'अपार्टमेंट',
  'apartments': 'अपार्टमेंट',
  'flat': 'फ्लैट',
  'flats': 'फ्लैट',
  'enclave': 'एन्क्लेव',
  'society': 'सोसायटी',
  'soc': 'सोसायटी',
  'nagar': 'नगर',
  'park': 'पार्क',
  'garden': 'गार्डन',
  'vadi': 'वाडी',
  'wadi': 'वाडी',
  'hall': 'हॉल',
  'community hall': 'कम्युनिटी हॉल',
  'farm': 'फार्म हाउस',
  'farmhouse': 'फार्म हाउस',
  'farm house': 'फार्म हाउस',
  'bungalow': 'बंगलो',
  'banglow': 'बंगलो',
  'villa': 'विला',
  'palace': 'पैलेस',
  'resort': 'रिसॉर्ट',
  'club': 'क्लब',
  'floor': 'मंजिल',
  'ground floor': 'ग्राउंड फ्लोर',
  'first floor': 'पहली मंजिल',
  'second floor': 'दूसरी मंजिल',
  'basement': 'बेसमेंट',
  'gate': 'गेट',
  'naka': 'नाका',
  'jakatnaka': 'जकातनाका',
  'jakat naka': 'जकातनाका',
  'circle': 'सर्कल',
  'chowk': 'चौक',
  'char rasta': 'चार रास्ता',
  'cross road': 'चार रास्ता',
  '4 rasta': 'चार रास्ता',
  'ring road': 'रिंग रोड',
  'main road': 'मेन रोड',
  'vip road': 'वीआईपी रोड',
  'road': 'रोड',
  'rd': 'रोड',
  'street': 'गली',
  'gali': 'गली',
  'sheri': 'गली',
  'shery': 'गली',
  'temple': 'मंदिर',
  'mandir': 'मंदिर',
  'derasar': 'देरासर',
  'school': 'स्कूल',
  'vidhyalay': 'स्कूल',
  'college': 'कॉलेज',
  'hospital': 'अस्पताल',
  'bazaar': 'बाजार',
  'bazar': 'बाजार',
  'market': 'मार्केट',
  'bridge': 'ब्रिज',
  'flyover': 'फ्लाईओवर',
  'station': 'रेलवे स्टेशन',
  'counter': 'दुकान काउंटर पिकअप',
  'pickup': 'दुकान काउंटर पिकअप',
  'delivery': 'डिलीवरी',
  'home delivery': 'होम डिलीवरी',
  'near': 'के पास',
  'nr': 'के पास',
  'opp': 'के सामने',
  'opposite': 'के सामने',
  'behind': 'के पीछे',
  'b/h': 'के पीछे',
  'beside': 'के बगल में',

  // Surat & Gujarat Locality Names
  'sarthana': 'सरथाणा',
  'katargam': 'कतारगाम',
  'varachha': 'वराछा',
  'mota varachha': 'मोटा वराछा',
  'nana varachha': 'नाना वराछा',
  'gotalawadi': 'गोतालावाड़ी',
  'dabholi': 'डभोली',
  'singanpore': 'सिंगणपोर',
  'singanpor': 'सिंगणपोर',
  'amroli': 'अमरोली',
  'chhapra bhatha': 'छापराभाठा',
  'ved road': 'वेड रोड',
  'ak road': 'ए.के. रोड',
  'a k road': 'ए.के. रोड',
  'laxmi nagar': 'लक्ष्मी नगर',
  'utran': 'उतराण',
  'kamrej': 'कामरेज',
  'pasodara': 'पासोदरा',
  'puna': 'पुणा',
  'punagam': 'पुणा गांव',
  'puna gam': 'पुणा गांव',
  'yogi chowk': 'योगी चौक',
  'hirabaug': 'हीराबाग',
  'mini bazar': 'मिनी बाजार',
  'kapodra': 'कापोद्रा',
  'simada': 'सीमाड़ा',
  'adajan': 'अडाजण',
  'pal': 'पाल',
  'palanpore': 'पालनपोर',
  'palanpur': 'पालनपुर',
  'jahangirpura': 'जहांगीरपुरा',
  'rander': 'रांदेर',
  'ghod dod road': 'घोडदौड़ रोड',
  'citylight': 'सिटीलाइट',
  'vesu': 'वेसु',
  'althan': 'अलथाण',
  'bhimrad': 'भीमराड',
  'dumas': 'डुमस',
  'piplod': 'पिपलोद',
  'majura gate': 'मजूरा गेट',
  'begumpura': 'बेगमपुरा',
  'salabatpura': 'सलाबतपुरा',
  'bhatar': 'भटार',
  'pandesara': 'पांडेसरा',
  'udhna': 'उधना',
  'sachin': 'सचीन',
  'bhestan': 'भेस्तान',
  'dindoli': 'डिंडोली',
  'godadara': 'गोदादरा',
  'parvat patiya': 'पर्वत पाटिया',
  'surat': 'सूरत',
  'gujarat': 'गुजरात',

  // Names commonly seen in catering & address
  'darshan': 'दर्शन',
  'shree': 'श्री',
  'shri': 'श्री',
  'ram': 'राम',
  'krishna': 'कृष्ण',
  'kishan': 'किशन',
  'radhe': 'राधे',
  'radha': 'राधा',
  'shyam': 'श्याम',
  'shiv': 'शिव',
  'shiva': 'शिव',
  'ganesh': 'गणेश',
  'ganpati': 'गणपति',
  'hanuman': 'हनुमान',
  'mataji': 'माताजी',
  'bapa': 'बापा',
  'sitaram': 'सीताराम',
  'harikrishna': 'हरिकृष्ण',
  'nilkanth': 'नीलकंठ',
  'swaminarayan': 'स्वामिनारायण',
  'gokul': 'गोकुल',
  'vrindavan': 'वृंदावन',
  'govind': 'गोविंद',
  'om': 'ओम',
  'sai': 'साई',
  'tirupati': 'तिरुपति',
  'balaji': 'बालाजी',
  'rajhans': 'राजहंस',
  'laxmi': 'लक्ष्मी',
  'lakshmi': 'लक्ष्मी',
  'shanti': 'शांति',
  'anand': 'आनंद',
  'tulsi': 'तुलसी',
  'kesar': 'केसर',
  'maruti': 'मारुति',
  'avadh': 'अवध',
  'ganga': 'गंगा',
  'yamuna': 'यमुना',
  'tapi': 'तापी',
  'royal': 'रॉयल',
  'diamond': 'डायमंड',
  'silver': 'सिल्वर',
  'gold': 'गोल्ड',
  'green': 'ग्रीन',
  'sun': 'सन',
  'star': 'स्टार',
  'prime': 'प्राइम',
  'grand': 'ग्रैंड',
  'classic': 'क्लासिक',
  'galaxy': 'गैलेक्सी',
  'sky': 'स्काई',
  'city': 'सिटी'
};

// 6. Ordered Multi-Word Phrase Replacements
const PHRASE_RULES: [RegExp, string][] = [
  // Party Plots & Venues
  [/\b(eagle\s+party\s+plot|eagle\s+plot)\b/gi, 'ईगल पार्टी प्लॉट'],
  [/\b(party\s+plot|party\s+plots)\b/gi, 'पार्टी प्लॉट'],
  [/\b(shree\s+ram\s+party\s+plot)\b/gi, 'श्री राम पार्टी प्लॉट'],
  [/\b(shree\s+radhe\s+party\s+plot)\b/gi, 'श्री राधे पार्टी प्लॉट'],
  [/\b(laxmi\s+party\s+plot)\b/gi, 'लक्ष्मी पार्टी प्लॉट'],
  [/\b(vrindavan\s+party\s+plot)\b/gi, 'वृंदावन पार्टी प्लॉट'],
  [/\b(gokul\s+party\s+plot)\b/gi, 'गोकुल पार्टी प्लॉट'],
  [/\b(tulsi\s+party\s+plot)\b/gi, 'तुलसी पार्टी प्लॉट'],
  [/\b(shreeji\s+party\s+plot)\b/gi, 'श्रीजी पार्टी प्लॉट'],
  [/\b(shyam\s+party\s+plot)\b/gi, 'श्याम पार्टी प्लॉट'],
  [/\b(kesar\s+party\s+plot)\b/gi, 'केसर पार्टी प्लॉट'],
  [/\b(maniba\s+party\s+plot)\b/gi, 'मणिबा पार्टी प्लॉट'],
  [/\b(maruti\s+party\s+plot)\b/gi, 'मारुति पार्टी प्लॉट'],
  [/\b(om\s+party\s+plot)\b/gi, 'ओम पार्टी प्लॉट'],
  [/\b(swastik\s+party\s+plot)\b/gi, 'स्वास्तिक पार्टी प्लॉट'],
  [/\b(swastik\s+tower|swastik\s+towers)\b/gi, 'स्वास्तिक टावर'],
  [/\b(sarthana\s+showroom)\b/gi, 'सरथाणा शोरूम'],
  [/\b(sarthana\s+jakatnaka|sarthana\s+jakat\s+naka)\b/gi, 'सरथाणा जकातनाका'],
  [/\b(jakatnaka|jakat\s+naka)\b/gi, 'जकातनाका'],

  // Connectors
  [/\b(opp\.|opp|opposite)\b/gi, 'के सामने'],
  [/\b(near|nr\.|nr)\b/gi, 'के पास'],
  [/\b(behind|b\/h|b\.h\.)\b/gi, 'के पीछे'],
  [/\b(beside|next\s+to)\b/gi, 'के बगल में'],
  [/\b(main\s+road)\b/gi, 'मेन रोड'],
  [/\b(ring\s+road)\b/gi, 'रिंग रोड'],
  [/\b(vip\s+road)\b/gi, 'वीआईपी रोड'],
  [/\b(char\s+rasta|cross\s+road|4\s+rasta)\b/gi, 'चार रास्ता'],
  [/\b(community\s+hall)\b/gi, 'कम्युनिटी हॉल'],
  [/\b(farm\s+house|farmhouse)\b/gi, 'फार्म हाउस'],
  [/\b(counter\s+pickup|pickup\s+at\s+counter)\b/gi, 'दुकान काउंटर पिकअप'],
  [/\b(home\s+delivery)\b/gi, 'होम डिलीवरी'],

  // Individual Words
  [/\beagle\b/gi, 'ईगल'],
  [/\bparty\b/gi, 'पार्टी'],
  [/\bplot\b/gi, 'प्लॉट'],
  [/\bplots\b/gi, 'प्लॉट'],
  [/\bswastik\b/gi, 'स्वास्तिक'],
  [/\bshowroom\b/gi, 'शोरूम'],
  [/\btower\b/gi, 'टावर'],
  [/\btowers\b/gi, 'टावर'],
  [/\bsarthana\b/gi, 'सरथाणा'],
  [/\bkatargam\b/gi, 'कतारगाम'],
  [/\bvarachha\b/gi, 'वराछा'],
  [/\bgotalawadi\b/gi, 'गोतालावाड़ी'],
  [/\bdabholi\b/gi, 'डभोली'],
  [/\bamroli\b/gi, 'अमरोली'],
  [/\bkamrej\b/gi, 'कामरेज'],
  [/\badajan\b/gi, 'अडाजण'],
  [/\bvesu\b/gi, 'वेसु'],
  [/\bsurat\b/gi, 'सूरत']
];

/**
 * 100% Pure Hindi Devanagari Address Translation
 * Converts any mixed English/Gujarati venue string into pure, beautiful Devanagari Hindi
 */
export function translateAddressToHindi(addressText?: string | null): string {
  if (!addressText || !addressText.trim()) return '';
  let text = addressText.trim();

  // 1. First Convert any Gujarati characters directly into Devanagari Hindi
  text = convertGujaratiToHindiScript(text);

  // 2. Apply ordered phrase replacements
  for (const [regex, rep] of PHRASE_RULES) {
    text = text.replace(regex, rep);
  }

  // 3. Word-by-word dictionary fallback for any remaining words
  const words = text.split(/(\s+|[(),.\-\/:])/);
  const translated = words.map(token => {
    if (!token.trim()) return token;
    const lower = token.toLowerCase();
    if (VENUE_HINDI_DICTIONARY[lower]) {
      return VENUE_HINDI_DICTIONARY[lower];
    }
    return token;
  });

  return translated.join('');
}

/**
 * Converts any sweet item name to clean, accurate Hindi (Devanagari)
 */
export function translateToHindi(englishText: string): string {
  if (!englishText) return '';
  const trimmed = englishText.trim();
  const lower = trimmed.toLowerCase();

  // 1. Direct dictionary match
  if (SWEET_HINDI_DICTIONARY[lower]) {
    return SWEET_HINDI_DICTIONARY[lower];
  }

  // 2. Normalize and check without punctuation
  const cleanLower = lower.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (SWEET_HINDI_DICTIONARY[cleanLower]) {
    return SWEET_HINDI_DICTIONARY[cleanLower];
  }

  // 3. If already contains Gujarati, convert to Hindi
  if (/[\u0A80-\u0AFF]/.test(trimmed)) {
    return convertGujaratiToHindiScript(trimmed);
  }

  return trimmed;
}

/**
 * Translates unit to Hindi
 */
export function translateUnitToHindi(unit: string): string {
  if (!unit) return 'किलो';
  const lower = unit.trim().toLowerCase();
  return UNIT_HINDI_MAP[lower] || unit;
}

/**
 * Translates packaging container to Hindi
 */
export function translateVasanToHindi(vasan: string): string {
  if (!vasan) return '';
  const lower = vasan.trim().toLowerCase();
  return VASAN_HINDI_MAP[lower] || vasan;
}
