-- 006_squads.sql
-- Seeds representative WC 2026 squads for all 48 teams.
-- Uses shirt-number-based IDs ({TEAM}-{NN}) which are stable and human-readable.
-- The sync-api-football function uses {TEAM}-{AF_PLAYER_ID} (large integers),
-- so there is no ID conflict — real API data will sit alongside this seed.
-- Rows with edited_by_admin = false (default) so sync can overwrite if needed.

INSERT INTO players (id, team_id, name, shirt_number, position) VALUES

-- ── Group A ──────────────────────────────────────────────────────────────
-- Mexico
('MEX-01','MEX','G. Ochoa',1,'GK'),
('MEX-03','MEX','C. Montes',3,'DEF'),
('MEX-04','MEX','É. Álvarez',4,'DEF'),
('MEX-07','MEX','H. Lozano',7,'FWD'),
('MEX-09','MEX','S. Giménez',9,'FWD'),
('MEX-18','MEX','E. Álvarez',18,'MID'),
('MEX-21','MEX','R. Alvarado',21,'MID'),

-- South Africa
('RSA-01','RSA','R. Williams',1,'GK'),
('RSA-03','RSA','S. Hlanti',3,'DEF'),
('RSA-04','RSA','T. Xulu',4,'DEF'),
('RSA-05','RSA','T. Mokoena',5,'MID'),
('RSA-08','RSA','B. Zungu',8,'MID'),
('RSA-10','RSA','P. Tau',10,'FWD'),
('RSA-09','RSA','E. Makgopa',9,'FWD'),

-- South Korea
('KOR-01','KOR','Kim Seung-gyu',1,'GK'),
('KOR-03','KOR','Kim Min-jae',3,'DEF'),
('KOR-04','KOR','Kim Young-gwon',4,'DEF'),
('KOR-07','KOR','Son Heung-min',7,'FWD'),
('KOR-08','KOR','Hwang In-beom',8,'MID'),
('KOR-10','KOR','Lee Jae-sung',10,'MID'),
('KOR-11','KOR','Hwang Hee-chan',11,'FWD'),

-- Czech Republic
('CZE-01','CZE','J. Pavlenka',1,'GK'),
('CZE-05','CZE','V. Coufal',5,'DEF'),
('CZE-14','CZE','O. Celustka',14,'DEF'),
('CZE-13','CZE','P. Schick',13,'FWD'),
('CZE-11','CZE','A. Hložek',11,'FWD'),
('CZE-28','CZE','T. Souček',28,'MID'),
('CZE-17','CZE','L. Provod',17,'MID'),

-- ── Group B ──────────────────────────────────────────────────────────────
-- Canada
('CAN-01','CAN','M. Crépeau',1,'GK'),
('CAN-03','CAN','A. Davies',3,'DEF'),
('CAN-05','CAN','S. Vitória',5,'DEF'),
('CAN-09','CAN','J. David',9,'FWD'),
('CAN-10','CAN','T. Buchanan',10,'FWD'),
('CAN-11','CAN','C. Larin',11,'FWD'),
('CAN-14','CAN','M.-A. Kaye',14,'MID'),

-- Bosnia & Herzegovina
('BIH-01','BIH','I. Šehić',1,'GK'),
('BIH-03','BIH','A. Ahmedhodžić',3,'DEF'),
('BIH-05','BIH','S. Kolašinac',5,'DEF'),
('BIH-09','BIH','E. Džeko',9,'FWD'),
('BIH-10','BIH','M. Pjanić',10,'MID'),
('BIH-15','BIH','A. Gojak',15,'MID'),
('BIH-11','BIH','E. Mulalić',11,'FWD'),

-- Qatar
('QAT-01','QAT','M. Barsham',1,'GK'),
('QAT-03','QAT','A. Hassan',3,'DEF'),
('QAT-08','QAT','K. Boudiaf',8,'MID'),
('QAT-10','QAT','H. Al-Haydos',10,'MID'),
('QAT-11','QAT','A. Afif',11,'FWD'),
('QAT-19','QAT','A. Ali',19,'FWD'),
('QAT-16','QAT','A. Hatem',16,'MID'),

-- Switzerland
('SUI-01','SUI','Y. Sommer',1,'GK'),
('SUI-05','SUI','M. Akanji',5,'DEF'),
('SUI-06','SUI','D. Ndoye',6,'DEF'),
('SUI-07','SUI','B. Embolo',7,'FWD'),
('SUI-08','SUI','R. Freuler',8,'MID'),
('SUI-10','SUI','G. Xhaka',10,'MID'),
('SUI-23','SUI','X. Shaqiri',23,'FWD'),

-- ── Group C ──────────────────────────────────────────────────────────────
-- Brazil
-- (existing seed rows — omit to avoid conflict; sync will update)
-- Morocco
('MAR-01','MAR','Y. Bounou',1,'GK'),
('MAR-02','MAR','A. Hakimi',2,'DEF'),
('MAR-05','MAR','R. Saïss',5,'DEF'),
('MAR-08','MAR','A. Ounahi',8,'MID'),
('MAR-09','MAR','Y. En-Nesyri',9,'FWD'),
('MAR-17','MAR','H. Ziyech',17,'MID'),
('MAR-11','MAR','S. Amrabat',11,'MID'),

-- Haiti
('HAI-01','HAI','A. Lafontant',1,'GK'),
('HAI-03','HAI','A. Bélizaire',3,'DEF'),
('HAI-05','HAI','J. Joseph',5,'DEF'),
('HAI-08','HAI','S. Saba',8,'MID'),
('HAI-09','HAI','K. Lafrance',9,'FWD'),
('HAI-10','HAI','D. Étienne',10,'MID'),
('HAI-11','HAI','K. Philogène',11,'FWD'),

-- Scotland
('SCO-01','SCO','A. Gunn',1,'GK'),
('SCO-03','SCO','A. Robertson',3,'DEF'),
('SCO-04','SCO','K. Tierney',4,'DEF'),
('SCO-07','SCO','J. McGinn',7,'MID'),
('SCO-08','SCO','S. McTominay',8,'MID'),
('SCO-09','SCO','C. Adams',9,'FWD'),
('SCO-14','SCO','R. Christie',14,'MID'),

-- ── Group D ──────────────────────────────────────────────────────────────
-- USA
('USA-01','USA','M. Turner',1,'GK'),
('USA-02','USA','S. Dest',2,'DEF'),
('USA-04','USA','T. Adams',4,'MID'),
('USA-07','USA','G. Reyna',7,'FWD'),
('USA-08','USA','W. McKennie',8,'MID'),
('USA-10','USA','C. Pulisic',10,'FWD'),
('USA-17','USA','T. Weah',17,'FWD'),

-- Paraguay
('PAR-01','PAR','A. Silva',1,'GK'),
('PAR-03','PAR','G. Gómez',3,'DEF'),
('PAR-05','PAR','M. Villasanti',5,'MID'),
('PAR-07','PAR','M. Almirón',7,'MID'),
('PAR-09','PAR','A. Sanabria',9,'FWD'),
('PAR-11','PAR','Á. Romero',11,'FWD'),
('PAR-18','PAR','J. Enciso',18,'MID'),

-- Australia
('AUS-01','AUS','M. Ryan',1,'GK'),
('AUS-05','AUS','T. Degenek',5,'DEF'),
('AUS-06','AUS','H. Souttar',6,'DEF'),
('AUS-07','AUS','M. Leckie',7,'FWD'),
('AUS-08','AUS','A. Hrustić',8,'MID'),
('AUS-10','AUS','M. Boyle',10,'FWD'),
('AUS-11','AUS','R. McGree',11,'MID'),

-- Turkey
('TUR-01','TUR','A. Bayındır',1,'GK'),
('TUR-03','TUR','M. Demiral',3,'DEF'),
('TUR-04','TUR','S. Soyuncu',4,'DEF'),
('TUR-07','TUR','K. Aktürkoğlu',7,'FWD'),
('TUR-08','TUR','A. Güler',8,'MID'),
('TUR-10','TUR','H. Çalhanoğlu',10,'MID'),
('TUR-11','TUR','C. Ünder',11,'FWD'),

-- ── Group E ──────────────────────────────────────────────────────────────
-- Germany
-- (existing seed rows — omit to avoid conflict)
-- Curaçao
('CUW-01','CUW','E. Room',1,'GK'),
('CUW-03','CUW','C. Martina',3,'DEF'),
('CUW-05','CUW','J. Timber',5,'DEF'),
('CUW-07','CUW','E. Hooi',7,'FWD'),
('CUW-08','CUW','E. Doyle',8,'MID'),
('CUW-11','CUW','L. Bacuna',11,'MID'),

-- Ivory Coast
('CIV-01','CIV','Y. Fofana',1,'GK'),
('CIV-02','CIV','S. Aurier',2,'DEF'),
('CIV-05','CIV','F. Kessié',5,'MID'),
('CIV-09','CIV','S. Haller',9,'FWD'),
('CIV-10','CIV','W. Zaha',10,'FWD'),
('CIV-19','CIV','N. Pépé',19,'FWD'),
('CIV-23','CIV','I. Sangaré',23,'MID'),

-- Ecuador
('ECU-01','ECU','H. Galíndez',1,'GK'),
('ECU-03','ECU','P. Hincapié',3,'DEF'),
('ECU-05','ECU','M. Caicedo',5,'MID'),
('ECU-07','ECU','Á. Mena',7,'FWD'),
('ECU-11','ECU','G. Plata',11,'FWD'),
('ECU-13','ECU','E. Valencia',13,'FWD'),
('ECU-21','ECU','J. Cifuentes',21,'MID'),

-- ── Group F ──────────────────────────────────────────────────────────────
-- Netherlands
-- (existing seed rows — omit to avoid conflict)
-- Japan
('JPN-01','JPN','S. Gonda',1,'GK'),
('JPN-03','JPN','H. Itō',3,'DEF'),
('JPN-05','JPN','M. Yoshida',5,'DEF'),
('JPN-09','JPN','T. Minamino',9,'MID'),
('JPN-10','JPN','D. Kamada',10,'MID'),
('JPN-14','JPN','R. Doan',14,'FWD'),
('JPN-15','JPN','T. Ueda',15,'FWD'),

-- Sweden
('SWE-01','SWE','R. Olsen',1,'GK'),
('SWE-02','SWE','V. Lindelöf',2,'DEF'),
('SWE-05','SWE','I. Cabral',5,'DEF'),
('SWE-07','SWE','A. Elanga',7,'FWD'),
('SWE-08','SWE','E. Forsberg',8,'MID'),
('SWE-09','SWE','A. Isak',9,'FWD'),
('SWE-10','SWE','D. Kulusevski',10,'MID'),

-- Tunisia
('TUN-01','TUN','A. Dahmen',1,'GK'),
('TUN-04','TUN','D. Bronn',4,'DEF'),
('TUN-05','TUN','M. Meriah',5,'DEF'),
('TUN-07','TUN','Y. Msakni',7,'MID'),
('TUN-08','TUN','H. Mejbri',8,'MID'),
('TUN-09','TUN','I. Jebali',9,'FWD'),
('TUN-10','TUN','W. Khazri',10,'FWD'),

-- ── Group G ──────────────────────────────────────────────────────────────
-- Belgium
('BEL-01','BEL','K. Casteels',1,'GK'),
('BEL-02','BEL','T. Alderweireld',2,'DEF'),
('BEL-04','BEL','J. Vertonghen',4,'DEF'),
('BEL-07','BEL','K. De Bruyne',7,'MID'),
('BEL-09','BEL','R. Lukaku',9,'FWD'),
('BEL-11','BEL','L. Trossard',11,'FWD'),
('BEL-16','BEL','C. De Ketelaere',16,'MID'),

-- Egypt
('EGY-01','EGY','M. El-Shenawy',1,'GK'),
('EGY-04','EGY','A. Hegazi',4,'DEF'),
('EGY-05','EGY','O. Kamal',5,'DEF'),
('EGY-08','EGY','A. El-Sulaya',8,'MID'),
('EGY-09','EGY','O. Marmoush',9,'FWD'),
('EGY-10','EGY','M. Salah',10,'FWD'),
('EGY-17','EGY','Trézéguet',17,'FWD'),

-- Iran
('IRN-01','IRN','A. Beiranvand',1,'GK'),
('IRN-02','IRN','R. Rezaeian',2,'DEF'),
('IRN-03','IRN','E. Hajsafi',3,'DEF'),
('IRN-07','IRN','S. Azmoun',7,'FWD'),
('IRN-09','IRN','M. Taremi',9,'FWD'),
('IRN-11','IRN','A. Gholizadeh',11,'MID'),
('IRN-21','IRN','A. Jahanbakhsh',21,'FWD'),

-- New Zealand
('NZL-01','NZL','S. Marinovic',1,'GK'),
('NZL-03','NZL','L. Cacace',3,'DEF'),
('NZL-05','NZL','B. Tuilagi',5,'DEF'),
('NZL-08','NZL','M. Garbett',8,'MID'),
('NZL-09','NZL','C. Wood',9,'FWD'),
('NZL-10','NZL','C. Lewis',10,'MID'),
('NZL-11','NZL','M. Woud',11,'FWD'),

-- ── Group H ──────────────────────────────────────────────────────────────
-- Spain
('ESP-01','ESP','U. Simón',1,'GK'),
('ESP-02','ESP','D. Carvajal',2,'DEF'),
('ESP-08','ESP','Gavi',8,'MID'),
('ESP-16','ESP','Rodri',16,'MID'),
('ESP-07','ESP','Á. Morata',7,'FWD'),
('ESP-26','ESP','Pedri',26,'MID'),
('ESP-10','ESP','D. Olmo',10,'FWD'),

-- Cape Verde
('CPV-12','CPV','Vozinha',12,'GK'),
('CPV-04','CPV','Stopira',4,'DEF'),
('CPV-05','CPV','B. Varela',5,'DEF'),
('CPV-06','CPV','M. Soares',6,'MID'),
('CPV-07','CPV','G. Rodrigues',7,'FWD'),
('CPV-08','CPV','J. Monteiro',8,'MID'),
('CPV-11','CPV','R. Mendes',11,'FWD'),

-- Saudi Arabia
('KSA-01','KSA','M. Al-Owais',1,'GK'),
('KSA-03','KSA','A. Al-Amri',3,'DEF'),
('KSA-04','KSA','A. Al-Bulaihi',4,'DEF'),
('KSA-08','KSA','M. Kanno',8,'MID'),
('KSA-09','KSA','S. Al-Shehri',9,'FWD'),
('KSA-10','KSA','S. Al-Dawsari',10,'FWD'),
('KSA-13','KSA','Y. Al-Shahrani',13,'DEF'),

-- Uruguay
('URU-01','URU','S. Rochet',1,'GK'),
('URU-02','URU','R. Araújo',2,'DEF'),
('URU-04','URU','S. Coates',4,'DEF'),
('URU-08','URU','F. Valverde',8,'MID'),
('URU-09','URU','D. Núñez',9,'FWD'),
('URU-11','URU','F. Pellistri',11,'FWD'),
('URU-18','URU','R. Bentancur',18,'MID'),

-- ── Group I ──────────────────────────────────────────────────────────────
-- France
-- (existing seed rows — omit to avoid conflict)
-- Senegal
('SEN-01','SEN','É. Mendy',1,'GK'),
('SEN-03','SEN','K. Koulibaly',3,'DEF'),
('SEN-05','SEN','Y. Sabaly',5,'DEF'),
('SEN-08','SEN','P. Matar Sarr',8,'MID'),
('SEN-10','SEN','S. Mané',10,'FWD'),
('SEN-15','SEN','I. Gueye',15,'MID'),
('SEN-19','SEN','I. Sarr',19,'FWD'),

-- Iraq
('IRQ-01','IRQ','J. Hassan',1,'GK'),
('IRQ-03','IRQ','A. Adnan',3,'DEF'),
('IRQ-05','IRQ','A. Al-Hamdani',5,'DEF'),
('IRQ-07','IRQ','H. Al-Emari',7,'MID'),
('IRQ-08','IRQ','A. Attwan',8,'MID'),
('IRQ-09','IRQ','M. Ali',9,'FWD'),
('IRQ-10','IRQ','A. Yasin',10,'MID'),

-- Norway
('NOR-01','NOR','Ø. Nyland',1,'GK'),
('NOR-05','NOR','S. Strandberg',5,'DEF'),
('NOR-06','NOR','A. Strand Larsen',6,'FWD'),
('NOR-08','NOR','M. Ødegaard',8,'MID'),
('NOR-09','NOR','E. Haaland',9,'FWD'),
('NOR-16','NOR','S. Berge',16,'MID'),
('NOR-20','NOR','A. Sørloth',20,'FWD'),

-- ── Group J ──────────────────────────────────────────────────────────────
-- Argentina
-- (existing seed rows — omit to avoid conflict)
-- Algeria
('ALG-01','ALG','R. M''Bolhi',1,'GK'),
('ALG-03','ALG','D. Benlamri',3,'DEF'),
('ALG-06','ALG','A. Mandi',6,'DEF'),
('ALG-08','ALG','H. Aouar',8,'MID'),
('ALG-09','ALG','I. Slimani',9,'FWD'),
('ALG-11','ALG','S. Benrahma',11,'MID'),
('ALG-26','ALG','R. Mahrez',26,'FWD'),

-- Austria
('AUT-01','AUT','P. Pentz',1,'GK'),
('AUT-05','AUT','D. Alaba',5,'DEF'),
('AUT-06','AUT','K. Lainer',6,'DEF'),
('AUT-07','AUT','M. Sabitzer',7,'MID'),
('AUT-08','AUT','C. Baumgartner',8,'MID'),
('AUT-09','AUT','M. Arnautovic',9,'FWD'),
('AUT-11','AUT','M. Gregoritsch',11,'FWD'),

-- Jordan
('JOR-01','JOR','Y. Abu Laila',1,'GK'),
('JOR-03','JOR','B. Faisal',3,'DEF'),
('JOR-04','JOR','K. Al-Duhour',4,'DEF'),
('JOR-05','JOR','N. Al-Rawabdeh',5,'MID'),
('JOR-08','JOR','A. Hayel',8,'MID'),
('JOR-09','JOR','A. Nasib',9,'FWD'),
('JOR-10','JOR','M. Al-Tamari',10,'FWD'),

-- ── Group K ──────────────────────────────────────────────────────────────
-- Portugal
-- (existing seed rows — omit to avoid conflict)
-- DR Congo
('COD-01','COD','J. Kiasumbua',1,'GK'),
('COD-03','COD','C. Mbemba',3,'DEF'),
('COD-05','COD','A. Masuaku',5,'DEF'),
('COD-07','COD','Y. Wissa',7,'FWD'),
('COD-09','COD','C. Bakambu',9,'FWD'),
('COD-11','COD','Y. Bolasie',11,'FWD'),
('COD-08','COD','M. Saïd',8,'MID'),

-- Uzbekistan
('UZB-01','UZB','A. Nematov',1,'GK'),
('UZB-03','UZB','K. Alikulov',3,'DEF'),
('UZB-05','UZB','O. Shukurov',5,'MID'),
('UZB-07','UZB','S. Nasrullayev',7,'MID'),
('UZB-09','UZB','J. Yakhshiboev',9,'FWD'),
('UZB-10','UZB','A. Fayzullaev',10,'MID'),
('UZB-11','UZB','E. Shomurodov',11,'FWD'),

-- Colombia
('COL-01','COL','C. Vargas',1,'GK'),
('COL-03','COL','D. Sánchez',3,'DEF'),
('COL-05','COL','W. Barrios',5,'MID'),
('COL-07','COL','L. Díaz',7,'FWD'),
('COL-09','COL','R. Santos Borré',9,'FWD'),
('COL-10','COL','J. Rodríguez',10,'MID'),
('COL-18','COL','J. Lerma',18,'MID'),

-- ── Group L ──────────────────────────────────────────────────────────────
-- England
('ENG-01','ENG','J. Pickford',1,'GK'),
('ENG-02','ENG','K. Walker',2,'DEF'),
('ENG-04','ENG','D. Rice',4,'MID'),
('ENG-09','ENG','H. Kane',9,'FWD'),
('ENG-10','ENG','J. Grealish',10,'MID'),
('ENG-22','ENG','J. Bellingham',22,'MID'),
('ENG-47','ENG','P. Foden',47,'MID'),

-- Croatia
('CRO-01','CRO','D. Livaković',1,'GK'),
('CRO-04','CRO','I. Perišić',4,'FWD'),
('CRO-06','CRO','J. Gvardiol',6,'DEF'),
('CRO-10','CRO','L. Modrić',10,'MID'),
('CRO-11','CRO','M. Brozović',11,'MID'),
('CRO-16','CRO','M. Pašalić',16,'MID'),
('CRO-21','CRO','B. Petković',21,'FWD'),

-- Ghana
('GHA-01','GHA','L. Ati-Zigi',1,'GK'),
('GHA-05','GHA','D. Amartey',5,'DEF'),
('GHA-06','GHA','A. Djiku',6,'DEF'),
('GHA-08','GHA','T. Partey',8,'MID'),
('GHA-10','GHA','M. Kudus',10,'MID'),
('GHA-11','GHA','J. Ayew',11,'FWD'),
('GHA-22','GHA','A. Semenyo',22,'FWD'),

-- Panama
('PAN-01','PAN','L. Mejía',1,'GK'),
('PAN-03','PAN','H. Cummings',3,'DEF'),
('PAN-05','PAN','F. Córdoba',5,'DEF'),
('PAN-08','PAN','A. Ayarza',8,'MID'),
('PAN-09','PAN','I. Díaz',9,'FWD'),
('PAN-17','PAN','É. Bárcenas',17,'FWD'),
('PAN-21','PAN','A. Quintero',21,'MID')

ON CONFLICT (id) DO NOTHING;
