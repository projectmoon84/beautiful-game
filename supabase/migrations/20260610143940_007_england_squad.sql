-- Replace the placeholder England squad with a realistic WC 2026 23-man squad.
DELETE FROM players WHERE team_id = 'ENG';

INSERT INTO players (id, team_id, name, shirt_number, position) VALUES
-- Goalkeepers
('ENG-01','ENG','J. Pickford',1,'GK'),
('ENG-13','ENG','D. Henderson',13,'GK'),
('ENG-23','ENG','J. Trafford',23,'GK'),
-- Defenders
('ENG-02','ENG','K. Trippier',2,'DEF'),
('ENG-03','ENG','L. Shaw',3,'DEF'),
('ENG-05','ENG','J. Stones',5,'DEF'),
('ENG-06','ENG','M. Guehi',6,'DEF'),
('ENG-12','ENG','E. Konsa',12,'DEF'),
('ENG-14','ENG','T. Alexander-Arnold',14,'DEF'),
('ENG-15','ENG','B. White',15,'DEF'),
('ENG-21','ENG','L. Hall',21,'DEF'),
-- Midfielders
('ENG-04','ENG','D. Rice',4,'MID'),
('ENG-08','ENG','K. Mainoo',8,'MID'),
('ENG-16','ENG','C. Gallagher',16,'MID'),
('ENG-18','ENG','A. Wharton',18,'MID'),
('ENG-22','ENG','J. Bellingham',22,'MID'),
-- Forwards
('ENG-07','ENG','B. Saka',7,'FWD'),
('ENG-09','ENG','H. Kane',9,'FWD'),
('ENG-10','ENG','J. Grealish',10,'FWD'),
('ENG-11','ENG','M. Rashford',11,'FWD'),
('ENG-17','ENG','E. Eze',17,'FWD'),
('ENG-19','ENG','A. Gordon',19,'FWD'),
('ENG-20','ENG','C. Palmer',20,'FWD'),
('ENG-47','ENG','P. Foden',47,'MID');
