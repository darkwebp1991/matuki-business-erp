import { getDatabase } from '../server/database/connection.js';

const db = getDatabase();

const partyPlots = [
  // --- 1. SARTHANA (સરથાણા) ---
  {
    venue_name: 'Avsar Party Plot & Lawn',
    address: 'Near RD Farm, Simada Road, Sarthana Jakat Naka, Surat - 395006',
    area_landmark: 'Sarthana',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Avsar+Party+Plot+Lawn+Sarthana+Jakat+Naka+Surat'
  },
  {
    venue_name: 'Eagle Party Plot',
    address: 'Near Sarthana Police Station, Simada Gam, Sarthana, Surat - 395006',
    area_landmark: 'Sarthana',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Eagle+Party+Plot+Simada+Sarthana+Surat'
  },
  {
    venue_name: 'Rajpat Party Plot',
    address: 'Sarthana Jakat Naka, Sarthana, Surat - 395006',
    area_landmark: 'Sarthana',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Rajpat+Party+Plot+Sarthana+Surat'
  },
  {
    venue_name: 'Vivah Party Plot',
    address: 'Opp. Sarthana Nature Park & Zoo, Pasodara Road, Sarthana, Surat - 395006',
    area_landmark: 'Sarthana',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Vivah+Party+Plot+Sarthana+Zoo+Surat'
  },
  {
    venue_name: 'GJ 5 Party Plot',
    address: 'Near Sarthana Nature Park, Sarthana, Surat - 395006',
    area_landmark: 'Sarthana',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=GJ+5+Party+Plot+Sarthana+Surat'
  },
  {
    venue_name: 'Sarthana Community Hall & Party Plot',
    address: 'Opp. Zoo, Sarthana Jakatnaka, Surat - 395006',
    area_landmark: 'Sarthana',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Sarthana+Community+Hall+Party+Plot+Surat'
  },
  {
    venue_name: 'Elegance Party Plot',
    address: 'Near Sarthana Jakat Naka, Sarthana, Surat - 395006',
    area_landmark: 'Sarthana',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Elegance+Party+Plot+Sarthana+Surat'
  },
  {
    venue_name: 'Simada Party Plot',
    address: 'Simada BRTS Road, Near Sarthana, Surat - 395006',
    area_landmark: 'Sarthana',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Simada+Party+Plot+Sarthana+Surat'
  },

  // --- 2. VARACHHA & NANA VARACHHA (વરાછા / નાના વરાછા) ---
  {
    venue_name: 'Jeli Baa Party Plot',
    address: 'Varachha Main Road, Surat - 395006',
    area_landmark: 'Varachha',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Jeli+Baa+Party+Plot+Varachha+Surat'
  },
  {
    venue_name: 'Heaven Party Plot',
    address: 'Varachha Main Road, Surat - 395006',
    area_landmark: 'Varachha',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Heaven+Party+Plot+Varachha+Surat'
  },
  {
    venue_name: 'Unnati Farm & Party Plot',
    address: 'Simada BRTS Road, Nana Varachha, Surat - 395006',
    area_landmark: 'Varachha',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Unnati+Farm+Nana+Varachha+Surat'
  },
  {
    venue_name: 'Shiv Party Plot',
    address: 'Near Nana Varachha Police Station, Nana Varachha, Surat - 395006',
    area_landmark: 'Varachha',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Shiv+Party+Plot+Nana+Varachha+Surat'
  },
  {
    venue_name: 'Apple Farm & Party Plot',
    address: 'Varachha Road, Surat - 395006',
    area_landmark: 'Varachha',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Apple+Farm+Varachha+Surat'
  },
  {
    venue_name: 'Varachha Community Hall (Hira Baug)',
    address: 'Near Hira Baug, Varachha Main Road, Surat - 395006',
    area_landmark: 'Varachha',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Varachha+Community+Hall+Hira+Baug+Surat'
  },
  {
    venue_name: 'Radhe Krishna Party Plot',
    address: 'Varachha Main Road, Surat - 395006',
    area_landmark: 'Varachha',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Radhe+Krishna+Party+Plot+Varachha+Surat'
  },

  // --- 3. CANAL ROAD (કેનાલ રોડ) ---
  {
    venue_name: 'Janki Party Plot',
    address: 'Canal Road, Kosmada, Opp. Heaven Party Plot, Surat - 395006',
    area_landmark: 'Canal Road',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Janki+Party+Plot+Canal+Road+Kosmada+Surat'
  },
  {
    venue_name: 'Trilok Party Lawns',
    address: 'Near Bullet Train Crossing, Canal Road, Kosmada, Surat - 395006',
    area_landmark: 'Canal Road',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Trilok+Party+Lawns+Canal+Road+Kosmada+Surat'
  },
  {
    venue_name: 'Vrundavan Party Plot',
    address: 'Canal Road, Kosmada, Behind Annapurna Kathiyawadi, Surat - 395006',
    area_landmark: 'Canal Road',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Vrundavan+Party+Plot+Canal+Road+Kosmada+Surat'
  },
  {
    venue_name: 'Wedding Palaces Party Plot',
    address: 'Canal Road, Kosmada Area, Surat - 395006',
    area_landmark: 'Canal Road',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Wedding+Palaces+Party+Plot+Kosmada+Canal+Road+Surat'
  },
  {
    venue_name: 'Madhusudan Party Plot',
    address: 'Canal Road, Near Green Land Cinema, Vesu-Canal, Surat - 395007',
    area_landmark: 'Canal Road',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Madhusudan+Party+Plot+Canal+Road+Surat'
  },
  {
    venue_name: 'Jamnaba Party Plot',
    address: 'Canal Road, Vesu Corridor, Surat - 395007',
    area_landmark: 'Canal Road',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Jamnaba+Party+Plot+Canal+Road+Surat'
  },
  {
    venue_name: 'Manbhari Vatika Party Lawns',
    address: 'Canal Road, Near GAIL Colony, Surat - 395007',
    area_landmark: 'Canal Road',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Manbhari+Vatika+Canal+Road+Surat'
  },
  {
    venue_name: 'Sai Jalaram Vatika',
    address: 'Canal Road, Surat - 395007',
    area_landmark: 'Canal Road',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Sai+Jalaram+Vatika+Canal+Road+Surat'
  },
  {
    venue_name: 'Maniba Party Plot',
    address: 'Bharthana Canal Road, Surat - 395007',
    area_landmark: 'Canal Road',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Maniba+Party+Plot+Canal+Road+Surat'
  },

  // --- 4. YOGI CHOWK (યોગી ચોક) ---
  {
    venue_name: 'Yogi Chowk Community Hall & Party Plot',
    address: 'Yogidhara Society, Yogi Chowk, Surat - 395006',
    area_landmark: 'Yogi Chowk',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Yogi+Chowk+Community+Hall+Surat'
  },
  {
    venue_name: 'Unity Party Plot & Lawns',
    address: 'Near Yogi Chowk, Varachha, Surat - 395006',
    area_landmark: 'Yogi Chowk',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Unity+Party+Plot+Yogi+Chowk+Surat'
  },
  {
    venue_name: 'Om Farm & Party Plot',
    address: 'Near SMC Water Tank, Varachha Bank Road, Yogi Chowk, Surat - 395006',
    area_landmark: 'Yogi Chowk',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Om+Farm+Yogi+Chowk+Surat'
  },
  {
    venue_name: 'Royal Farm & Party Plot',
    address: 'Near Swaminarayan Temple, Shiv Darshan Society, Yogi Chowk, Surat - 395006',
    area_landmark: 'Yogi Chowk',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Royal+Farm+Yogi+Chowk+Surat'
  },
  {
    venue_name: 'Radhe Farm & Party Plot',
    address: 'Mansarovar Society, Yogi Chowk, Surat - 395006',
    area_landmark: 'Yogi Chowk',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Radhe+Farm+Mansarovar+Yogi+Chowk+Surat'
  },
  {
    venue_name: 'Sahajanand Party Plot',
    address: 'Yogi Chowk Main Road, Surat - 395006',
    area_landmark: 'Yogi Chowk',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Sahajanand+Party+Plot+Yogi+Chowk+Surat'
  },
  {
    venue_name: 'Harikrushna Farm House',
    address: 'Shiv Darshan Society, Near Yogi Chowk, Surat - 395006',
    area_landmark: 'Yogi Chowk',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Harikrushna+Farm+House+Yogi+Chowk+Surat'
  },
  {
    venue_name: 'Bapa Sitaram Farm & Party Lawn',
    address: 'Near Kiran Chowk, Yogi Chowk / Punagam, Surat - 395006',
    area_landmark: 'Yogi Chowk',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Bapa+Sitaram+Farm+Kiran+Chowk+Surat'
  },
  {
    venue_name: 'Maharaja Farm (Simada-Yogi Chowk)',
    address: 'Simada Gam Road, Near Yogi Chowk, Surat - 395006',
    area_landmark: 'Yogi Chowk',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Maharaja+Farm+Simada+Surat'
  },

  // --- 5. MOTA VARACHHA (મોટા વરાછા) ---
  {
    venue_name: 'Radha Krishna Farm & Party Plot',
    address: 'Near Maharaja Circle, Mota Varachha, Surat - 394101',
    area_landmark: 'Mota Varachha',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Radha+Krishna+Farm+Party+Plot+Mota+Varachha+Surat'
  },
  {
    venue_name: 'The Majestica Party Lawns',
    address: 'Near Mithila Hills, Outer Ring Road, Mota Varachha, Surat - 394101',
    area_landmark: 'Mota Varachha',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=The+Majestica+Party+Lawns+Mota+Varachha+Surat'
  },
  {
    venue_name: 'Shivansh Party Plot',
    address: 'Near Sudama Chowk, Mota Varachha, Surat - 394101',
    area_landmark: 'Mota Varachha',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Shivansh+Party+Plot+Mota+Varachha+Surat'
  },
  {
    venue_name: 'Maharaja Farm & Party Plots',
    address: 'Maharaja Circle, Mota Varachha, Surat - 394101',
    area_landmark: 'Mota Varachha',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Maharaja+Farm+Party+Plots+Mota+Varachha+Surat'
  },
  {
    venue_name: 'Apex Party Plot',
    address: 'Near Paramount International School, Anand Dhara Society, Mota Varachha, Surat - 394101',
    area_landmark: 'Mota Varachha',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Apex+Party+Plot+Mota+Varachha+Surat'
  },
  {
    venue_name: 'Meet Farm & Party Plot',
    address: 'Near Riverview, Mota Varachha, Surat - 394101',
    area_landmark: 'Mota Varachha',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Meet+Farm+Mota+Varachha+Surat'
  },
  {
    venue_name: 'Astha Farm & Party Lawn',
    address: 'Mota Varachha Main Road, Surat - 394101',
    area_landmark: 'Mota Varachha',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Astha+Farm+Mota+Varachha+Surat'
  },
  {
    venue_name: 'Vraj Bhumi Farm & Party Plot',
    address: 'Mota Varachha, Surat - 394101',
    area_landmark: 'Mota Varachha',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Vraj+Bhumi+Farm+Mota+Varachha+Surat'
  },
  {
    venue_name: 'Ratnadeep Farm',
    address: 'Mota Varachha, Surat - 394101',
    area_landmark: 'Mota Varachha',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Ratnadeep+Farm+Mota+Varachha+Surat'
  },
  {
    venue_name: 'Bhadiyadara Farm',
    address: 'Mota Varachha, Surat - 394101',
    area_landmark: 'Mota Varachha',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Bhadiyadara+Farm+Mota+Varachha+Surat'
  },
  {
    venue_name: 'Utran-Mota Varachha Multi-Purpose Party Plot',
    address: 'SMC, Near Utran Bridge, Mota Varachha, Surat - 394101',
    area_landmark: 'Mota Varachha',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Utran+Mota+Varachha+Multi+Purpose+Party+Plot+Surat'
  },
  {
    venue_name: 'Madhav Farm & Party Plot',
    address: 'Near VIP Circle, Mota Varachha, Surat - 394101',
    area_landmark: 'Mota Varachha',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Madhav+Farm+VIP+Circle+Mota+Varachha+Surat'
  },
  {
    venue_name: 'Vrundavan Farm (Mota Varachha)',
    address: 'Near Essar Petrol Pump, Mota Varachha, Surat - 394101',
    area_landmark: 'Mota Varachha',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Vrundavan+Farm+Essar+Pump+Mota+Varachha+Surat'
  },

  // --- 6. KATARGAM (કતારગામ) ---
  {
    venue_name: 'Mani Baug Party Plot',
    address: 'Katargam Main Road, Surat - 395004',
    area_landmark: 'Katargam',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Mani+Baug+Party+Plot+Katargam+Surat'
  },
  {
    venue_name: 'Pramukh Swami Maharaj Community Hall',
    address: 'Main Road, Near Gotalawadi, Katargam, Surat - 395004',
    area_landmark: 'Katargam',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Pramukh+Swami+Maharaj+Community+Hall+Katargam+Surat'
  },
  {
    venue_name: 'Katargam SMC Multi-Purpose Party Plot',
    address: 'Near Hathidant Temple & Kiran Hospital, Katargam, Surat - 395004',
    area_landmark: 'Katargam',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Katargam+SMC+Party+Plot+Hathidant+Temple+Surat'
  },
  {
    venue_name: 'Green Villa Farm & Party Plot',
    address: 'Katargam GIDC Area, Surat - 395004',
    area_landmark: 'Katargam',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Green+Villa+Farm+Katargam+Surat'
  },
  {
    venue_name: 'Silver Garden Farm & Party Plot',
    address: 'Katargam - Amroli Road, Katargam, Surat - 395004',
    area_landmark: 'Katargam',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Silver+Garden+Farm+Katargam+Surat'
  },
  {
    venue_name: 'Avsar Farm & Party Plot (Katargam)',
    address: 'Katargam, Surat - 395004',
    area_landmark: 'Katargam',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Avsar+Farm+Katargam+Surat'
  },
  {
    venue_name: 'Shanghar Farm & Party Plot',
    address: 'Near Akhand Anand College, Katargam, Surat - 395004',
    area_landmark: 'Katargam',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Shanghar+Farm+Katargam+Surat'
  },
  {
    venue_name: 'Omwadi Farm & Party Plot',
    address: 'Katargam, Surat - 395004',
    area_landmark: 'Katargam',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Omwadi+Farm+Katargam+Surat'
  },
  {
    venue_name: 'DharmaBag Farm',
    address: 'Near Gotalawadi, Katargam, Surat - 395004',
    area_landmark: 'Katargam',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=DharmaBag+Farm+Katargam+Surat'
  },
  {
    venue_name: 'Heminom Farm & Party Plot',
    address: 'Near Laxmi Enclave, Katargam, Surat - 395004',
    area_landmark: 'Katargam',
    customer_charge: 0,
    driver_rent: 0,
    google_map_link: 'https://www.google.com/maps/search/?api=1&query=Heminom+Farm+Katargam+Surat'
  }
];

let added = 0;
let updated = 0;

const insertStmt = db.prepare(`
  INSERT INTO delivery_locations (venue_name, address, area_landmark, customer_charge, driver_rent, contact_person, contact_mobile, google_map_link, active)
  VALUES (?, ?, ?, ?, ?, '', '', ?, 1)
`);

const updateStmt = db.prepare(`
  UPDATE delivery_locations
  SET address = ?, area_landmark = ?, google_map_link = ?
  WHERE id = ?
`);

for (const p of partyPlots) {
  const existing = db.prepare('SELECT id, google_map_link FROM delivery_locations WHERE LOWER(TRIM(venue_name)) = LOWER(TRIM(?))').get(p.venue_name);
  if (existing) {
    updateStmt.run(p.address, p.area_landmark, p.google_map_link, existing.id);
    updated++;
  } else {
    insertStmt.run(p.venue_name, p.address, p.area_landmark, p.customer_charge, p.driver_rent, p.google_map_link);
    added++;
  }
}

console.log(`Successfully processed party plots: ${added} added, ${updated} updated.`);
const total = db.prepare('SELECT COUNT(*) as c FROM delivery_locations WHERE active = 1').get().c;
console.log(`Total active venues in database: ${total}`);
