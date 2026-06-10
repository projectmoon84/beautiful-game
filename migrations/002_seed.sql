-- Groups
INSERT INTO groups (id, label) VALUES
  ('A', 'Group A'),
  ('B', 'Group B'),
  ('C', 'Group C'),
  ('D', 'Group D');

-- Venues
INSERT INTO venues (id, stadium, city, country, fun_fact) VALUES
  ('V1', 'MetLife Stadium', 'New York/NJ', 'USA',    'Will host the 2026 final — the largest in the tournament.'),
  ('V2', 'Estadio Azteca',  'Mexico City', 'Mexico', 'The only stadium to host two previous World Cup finals.'),
  ('V3', 'BC Place',        'Vancouver',   'Canada', 'Sits right on the downtown waterfront.');

-- Teams (Group A)
INSERT INTO teams (id, name, short_code, flag_emoji, group_id, seed, title_odds, primary_hex, secondary_hex, tertiary_hex, on_primary, on_secondary, fun_fact, form) VALUES
('ARG','Argentina','ARG','🇦🇷','A',1,'9/2','#75AADB','#FFFFFF','#F6B40E','#0A2A52','#0A2A52','Reigning champions, unbeaten in their last 12 group games.',ARRAY['W','W','W','D','W']),
('FRA','France','FRA','🇫🇷','A',3,'5/1','#001E96','#FFFFFF','#EE2436','#FFFFFF','#001E96','France have reached two of the last three World Cup finals.',ARRAY['D','W','W','L','W']),
('URU','Uruguay','URU','🇺🇾','A',9,'28/1','#5FB4E8','#FFFFFF','#5FB4E8','#001A40','#001A40','Two-time world champions; the original host of the first-ever World Cup.',ARRAY['W','D','W','W','L']),
('POL','Poland','POL','🇵🇱','A',16,'80/1','#FFFFFF','#DC143C','#DC143C','#1A1A1A','#FFFFFF','Lewandowski is their all-time top scorer with over 80 international goals.',ARRAY['L','W','D','W','W']);

-- Teams (Group B)
INSERT INTO teams (id, name, short_code, flag_emoji, group_id, seed, title_odds, primary_hex, secondary_hex, tertiary_hex, on_primary, on_secondary, fun_fact, form) VALUES
('ESP','Spain','ESP','🇪🇸','B',4,'6/1','#C60B1E','#FFC400','#FFC400','#FFFFFF','#1A1A1A','Spain''s average squad age is the youngest of the favourites.',ARRAY['W','D','W','W','W']),
('ENG','England','ENG','🏴󠁧󠁢󠁥󠁮󠁧󠁿','B',5,'7/1','#FFFFFF','#CE1124','#001489','#001489','#FFFFFF','England have never won a World Cup on foreign soil.',ARRAY['L','W','D','W','W']),
('CRO','Croatia','CRO','🇭🇷','B',12,'40/1','#003087','#EF3340','#FFFFFF','#FFFFFF','#FFFFFF','Runners-up in 2018; Croatia punch well above their population of 3.8m.',ARRAY['W','W','L','D','W']),
('BEL','Belgium','BEL','🇧🇪','B',14,'50/1','#000000','#FFD700','#EF3340','#FFD700','#000000','Belgium''s 2018 ''golden generation'' makes one final push.',ARRAY['D','W','W','D','L']);

-- Teams (Group C)
INSERT INTO teams (id, name, short_code, flag_emoji, group_id, seed, title_odds, primary_hex, secondary_hex, tertiary_hex, on_primary, on_secondary, fun_fact, form) VALUES
('BRA','Brazil','BRA','🇧🇷','C',2,'13/2','#009739','#F5C800','#F5C800','#FFFFFF','#1A1A1A','Brazil have the shortest average squad height in the tournament.',ARRAY['W','W','D','W','L']),
('POR','Portugal','POR','🇵🇹','C',7,'8/1','#DA291C','#DA291C','#FFD100','#FFFFFF','#FFFFFF','Portugal have scored the most free-kicks in the tournament.',ARRAY['W','L','W','W','D']),
('SEN','Senegal','SEN','🇸🇳','C',11,'60/1','#00853F','#FDEF42','#EF3340','#FFFFFF','#1A1A1A','2022 Africa Cup of Nations winners; reached the quarter-finals in 2022.',ARRAY['W','W','D','W','L']),
('SRB','Serbia','SRB','🇷🇸','C',15,'100/1','#C6363C','#0C4076','#FFFFFF','#FFFFFF','#FFFFFF','Mitrović holds the European qualifying record with 14 goals in one campaign.',ARRAY['D','L','W','W','D']);

-- Teams (Group D)
INSERT INTO teams (id, name, short_code, flag_emoji, group_id, seed, title_odds, primary_hex, secondary_hex, tertiary_hex, on_primary, on_secondary, fun_fact, form) VALUES
('GER','Germany','GER','🇩🇪','D',6,'8/1','#000000','#DD0000','#FFCE00','#FFFFFF','#FFFFFF','Four-time winners, chasing a record-equalling fifth star.',ARRAY['W','D','L','W','W']),
('NED','Netherlands','NED','🇳🇱','D',8,'12/1','#AE1C28','#FF7900','#21468B','#FFFFFF','#FFFFFF','Three-time finalists who have never lifted the trophy.',ARRAY['D','D','W','L','W']),
('JPN','Japan','JPN','🇯🇵','D',13,'60/1','#BC002D','#FFFFFF','#BC002D','#FFFFFF','#1A1A1A','Knocked out both Germany and Spain in the 2022 group stage.',ARRAY['W','L','W','D','W']),
('MAR','Morocco','MAR','🇲🇦','D',10,'35/1','#C1272D','#006233','#C1272D','#FFFFFF','#FFFFFF','2022 semi-finalists — the first African team to reach the last four.',ARRAY['W','W','D','W','W']);

-- Players (Brazil)
INSERT INTO players (id, team_id, name, shirt_number, position) VALUES
('BRA-01','BRA','Alisson',     1,'GK'),
('BRA-02','BRA','Danilo',      2,'DEF'),
('BRA-03','BRA','Marquinhos',  3,'DEF'),
('BRA-05','BRA','Casemiro',    5,'MID'),
('BRA-07','BRA','Vinícius Jr', 7,'FWD'),
('BRA-08','BRA','Fabinho',     8,'MID'),
('BRA-09','BRA','Endrick',     9,'FWD'),
('BRA-10','BRA','Rodrygo',    10,'FWD'),
('BRA-11','BRA','Raphinha',   11,'FWD'),
('BRA-15','BRA','Thiago',     15,'MID'),
('BRA-19','BRA','Martinelli', 19,'FWD');

-- Players (Portugal)
INSERT INTO players (id, team_id, name, shirt_number, position) VALUES
('POR-01','POR','Diogo Costa',  1,'GK'),
('POR-02','POR','Dalot',        2,'DEF'),
('POR-03','POR','Pepe',         3,'DEF'),
('POR-07','POR','Ronaldo',      7,'FWD'),
('POR-08','POR','B. Fernandes', 8,'MID'),
('POR-10','POR','Bernardo',    10,'MID'),
('POR-11','POR','Leão',        11,'FWD'),
('POR-12','POR','Nuno Mendes', 12,'DEF'),
('POR-20','POR','Vitinha',     20,'MID');

-- Players (Argentina)
INSERT INTO players (id, team_id, name, shirt_number, position) VALUES
('ARG-01','ARG','E. Martínez', 1,'GK'),
('ARG-05','ARG','Paredes',     5,'MID'),
('ARG-10','ARG','Messi',      10,'FWD'),
('ARG-11','ARG','Lautaro',    11,'FWD'),
('ARG-13','ARG','Romero',     13,'DEF'),
('ARG-17','ARG','De Paul',    17,'MID'),
('ARG-26','ARG','Molina',     26,'DEF');

-- Players (France)
INSERT INTO players (id, team_id, name, shirt_number, position) VALUES
('FRA-01','FRA','Maignan',     1,'GK'),
('FRA-02','FRA','Pavard',      2,'DEF'),
('FRA-05','FRA','Kounde',      5,'DEF'),
('FRA-06','FRA','Rabiot',      6,'MID'),
('FRA-07','FRA','Griezmann',   7,'FWD'),
('FRA-10','FRA','Mbappé',     10,'FWD'),
('FRA-11','FRA','Dembélé',    11,'FWD'),
('FRA-14','FRA','Tchouaméni', 14,'MID');

-- Players (Germany)
INSERT INTO players (id, team_id, name, shirt_number, position) VALUES
('GER-01','GER','Neuer',         1,'GK'),
('GER-04','GER','Schlotterbeck', 4,'DEF'),
('GER-06','GER','Kimmich',       6,'MID'),
('GER-09','GER','Füllkrug',      9,'FWD'),
('GER-10','GER','Wirtz',        10,'MID'),
('GER-14','GER','Musiala',      14,'MID');

-- Players (Netherlands)
INSERT INTO players (id, team_id, name, shirt_number, position) VALUES
('NED-01','NED','Flekken',    1,'GK'),
('NED-02','NED','Frimpong',   2,'DEF'),
('NED-04','NED','Van Dijk',   4,'DEF'),
('NED-08','NED','F. de Jong', 8,'MID'),
('NED-09','NED','Gakpo',      9,'FWD'),
('NED-10','NED','Depay',     10,'FWD');

-- Fixtures
INSERT INTO fixtures (id, home_team_id, away_team_id, venue_id, group_id, kickoff_utc, stage, status, minute, home_score, away_score, man_of_match_player_id) VALUES
('F1','BRA','POR','V1','C','2026-06-08T19:00:00Z','group','finished',NULL,3,2,'BRA-07'),
('F4','GER','NED','V1','D','2026-06-08T16:00:00Z','group','finished',NULL,1,1,'NED-09'),
('F2','ARG','FRA','V2','A','2026-06-09T16:00:00Z','group','live',    67, 1,0,NULL),
('F3','ESP','ENG','V3','B','2026-06-09T19:00:00Z','group','scheduled',NULL,NULL,NULL,NULL),
('F5','BRA','SEN','V3','C','2026-06-10T16:00:00Z','group','scheduled',NULL,NULL,NULL,NULL),
('F6','POR','SRB','V2','C','2026-06-10T19:00:00Z','group','scheduled',NULL,NULL,NULL,NULL),
('F7','FRA','URU','V1','A','2026-06-11T16:00:00Z','group','scheduled',NULL,NULL,NULL,NULL),
('F8','ENG','BEL','V3','B','2026-06-11T19:00:00Z','group','scheduled',NULL,NULL,NULL,NULL);

-- Match events
INSERT INTO match_events (id, fixture_id, minute, type, team_id, player_id, assist_player_id) VALUES
('E-F1-1','F1',23,'goal',  'BRA','BRA-07','BRA-19'),
('E-F1-2','F1',48,'goal',  'BRA','BRA-07','BRA-15'),
('E-F1-3','F1',69,'goal',  'POR','POR-08','POR-20'),
('E-F1-4','F1',70,'yellow','BRA','BRA-05',NULL),
('E-F1-5','F1',85,'goal',  'POR','POR-02','POR-12'),
('E-F1-6','F1',87,'goal',  'BRA','BRA-15','BRA-08'),
('E-F2-1','F2',23,'goal',  'ARG','ARG-10','ARG-17'),
('E-F2-2','F2',45,'yellow','FRA','FRA-14',NULL),
('E-F4-1','F4',34,'goal',  'GER','GER-10','GER-14'),
('E-F4-2','F4',77,'goal',  'NED','NED-09','NED-02');

-- Insights
INSERT INTO insights (kind, team_id, value, blurb) VALUES
('Highest scoring', 'BRA', '3 goals',   'vs Portugal — a Group C statement.'),
('Most cards',      'GER', '2 yellows', 'Discipline a worry for the favourites.'),
('Dark horse',      'NED', '12/1',      'Held Germany; quietly building.'),
('Defying the odds','POR', 'Seed 7',    'Punching above their seeding so far.');
