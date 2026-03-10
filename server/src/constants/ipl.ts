export const IPL_TEAMS = [
  'Mumbai Indians',
  'Chennai Super Kings',
  'Royal Challengers Bengaluru',
  'Kolkata Knight Riders',
  'Delhi Capitals',
  'Sunrisers Hyderabad',
  'Rajasthan Royals',
  'Punjab Kings',
  'Gujarat Titans',
  'Lucknow Super Giants',
];

export const IPL_SQUADS: Record<string, string[]> = {
  'Mumbai Indians': [
    'Rohit Sharma', 'Suryakumar Yadav', 'Hardik Pandya', 'Tilak Varma', 'Ishan Kishan',
    'Jasprit Bumrah', 'Trent Boult', 'Tim David', 'Naman Dhir', 'Romario Shepherd',
    'Piyush Chawla', 'Dewald Brevis',
  ],
  'Chennai Super Kings': [
    'Ruturaj Gaikwad', 'Ravindra Jadeja', 'Deepak Chahar', 'Shardul Thakur', 'Faf du Plessis',
    'MS Dhoni', 'Shivam Dube', 'Moeen Ali', 'Devon Conway', 'Matheesha Pathirana',
    'Rachin Ravindra', 'Mitchell Santner',
  ],
  'Royal Challengers Bengaluru': [
    'Virat Kohli', 'Faf du Plessis', 'Glenn Maxwell', 'AB de Villiers', 'Rajat Patidar',
    'Mohammed Siraj', 'Harshal Patel', 'Dinesh Karthik', 'Josh Hazlewood', 'Cameron Green',
    'Reece Topley', 'Wanindu Hasaranga',
  ],
  'Kolkata Knight Riders': [
    'Shreyas Iyer', 'Rinku Singh', 'Varun Chakaravarthy', 'Mitchell Starc', 'Pat Cummins',
    'Umesh Yadav', 'Sunil Narine', 'Andre Russell', 'Phil Salt', 'Jason Roy',
    'Angkrish Raghuvanshi', 'Manish Pandey',
  ],
  'Delhi Capitals': [
    'David Warner', 'Axar Patel', 'Kuldeep Yadav', 'Mitchell Marsh', 'Prithvi Shaw',
    'Anrich Nortje', 'Sarfaraz Khan', 'Ishant Sharma', 'Khaleel Ahmed', 'Mukesh Kumar',
    'Yash Dhull', 'Ricky Bhui',
  ],
  'Sunrisers Hyderabad': [
    'Travis Head', 'Heinrich Klaasen', 'Bhuvneshwar Kumar', 'T Natarajan', 'Washington Sundar',
    'Pat Cummins', 'Abhishek Sharma', 'Aiden Markram', 'Marco Jansen', 'Shahbaz Ahmed',
    'Mayank Agarwal', 'Glenn Phillips',
  ],
  'Rajasthan Royals': [
    'Jos Buttler', 'Sanju Samson', 'Yuzvendra Chahal', 'Trent Boult', 'Shimron Hetmyer',
    'Devdutt Padikkal', 'Ravichandran Ashwin', 'Riyan Parag', 'Jason Holder', 'Kuldeep Sen',
    'Dhruv Jurel', 'Tom Kohler-Cadmore',
  ],
  'Punjab Kings': [
    'KL Rahul', 'Kagiso Rabada', 'Arshdeep Singh', 'Liam Livingstone', 'Sam Curran',
    'Jonny Bairstow', 'Shikhar Dhawan', 'Jitesh Sharma', 'Harpreet Brar', 'Nathan Ellis',
    'Prabhsimran Singh', 'Bhanuka Rajapaksa',
  ],
  'Gujarat Titans': [
    'Shubman Gill', 'Rashid Khan', 'Mohammed Shami', 'Mohit Sharma', 'David Miller',
    'Wriddhiman Saha', 'Vijay Shankar', 'Abhinav Manohar', 'Pradeep Sangwan', 'Noor Ahmad',
    'Darshan Nalkande', 'B Sai Sudharsan',
  ],
  'Lucknow Super Giants': [
    'Nicholas Pooran', 'AB de Villiers', 'Avesh Khan', 'Krunal Pandya', 'Quinton de Kock',
    'Mark Wood', 'Kyle Mayers', 'Deepak Hooda', 'Ravi Bishnoi', 'Manan Vohra',
    'Ayush Badoni', 'Jason Holder',
  ],
};

// Flat player list — union of all squads (for tournament-level predictions)
export const IPL_PLAYERS: string[] = Array.from(
  new Set(Object.values(IPL_SQUADS).flat())
).sort();
