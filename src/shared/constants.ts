// src/shared/constants.ts

export const IGNORED_INPUT_TYPES: readonly string[] = [
  "submit",
  "button",
  "file",
  "image",
  "reset",
  "hidden",
];

export const MAGIC_FILL_BG_COLOR = "#f3e5f5";
export const STORAGE_KEY_PREFIX = "autofill";

export const COMPANY_NAME_KH = [
  "ធនាគារ អេស៊ីលីដា",
  "ធនាគារ កាណាឌីយ៉ា",
  "ក្រុមហ៊ុន ជីប ម៉ុង",
  "ក្រុមហ៊ុន រ៉ូយ៉ាល់ គ្រុប",
  "ធនាគារ វឌ្ឍនៈ",
  "ក្រុមហ៊ុន សែលកាត",
  "ធនាគារ វីង",
  "ធនាគារ អេប៊ីអេ (ABA)",
  "ក្រុមហ៊ុន ខ្មែរ ប៊ែវើរីជីស",
  "រោងចក្រស្រាបៀរ កម្ពុជា",
  "កំពង់ផែស្វយ័តក្រុងព្រះសីហនុ",
  "រដ្ឋាករទឹកស្វយ័តក្រុងភ្នំពេញ",
  "ក្រុមហ៊ុន អុីហ្សុីខម (EZECOM)",
  "ក្រុមហ៊ុន ភេសជ្ជៈកម្ពុជា (Coca-Cola)",
  "ធនាគារ ហត្ថា",
  "ក្រុមហ៊ុន សូគីម៉ិច",
  "ក្រុមហ៊ុន ហ្គ្រេនធ្វីន អ៊ិនធើណេសិនណល",
  "ក្រុមហ៊ុន ម៉េងលី ជេ. គួច អប់រំ",
  "សហគ្រាសផលិតទឹកស្អាតកម្ពុជា",
  "ក្រុមហ៊ុន បុរី ភ្នំពេញថ្មី",
];

export const COMPANY_NAME_EN = [
  "ABA Bank",
  "Smart Axiata",
  "Cellcard",
  "Canadia Bank",
  "Chip Mong Group",
  "Royal Group",
  "EZECOM",
  "Prasac Microfinance",
  "Sathapana Bank",
  "Wing Bank",
  "Nexus Tech Solutions",
  "Quantum Digital Academy",
  "Apex Global Consulting",
  "Vanguard Software Group",
  "Sterling Financial Services",
  "Blue Horizon Ventures",
  "Summit Education Center",
  "Pinnacle Creative Agency",
  "Ironclad Cybersecurity",
  "Velocity Logistics",
];

export const NAME_KH = [
  "សេរី",
  "វិជ្ជា",
  "សុវណ្ណ",
  "រិទ្ធី",
  "ណារិទ្ធ",
  "បុរី",
  "វិសាល",
  "ដារារិទ្ធ",
  "ឧត្តម",
  "ភារុណ",
  "បុប្ផា",
  "ស្រីនាង",
  "កល្យាណ",
  "ទេវី",
  "ឆវី",
  "នារី",
  "លក្ខិណា",
  "សុរិយ័ន",
  "ចំរើន",
  "វណ្ណារី",
];

export const LAST_NAME_EN = [
  "Smith", "Doe", "Johnson", "Brown", "Miller", "Davis",
  "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson",
  "White", "Harris", "Martin", "Garcia", "Lee", "Clark",
];

export const FIRST_NAME_EN = [
  "Alex", "Jordan", "Taylor", "Casey", "Riley", "Sam", "Jamie",
  "Morgan", "Avery", "Cameron", "Dakota", "Emery", "Harper",
  "Logan", "Quinn", "Reese", "Skyler", "Drew", "Blake",
];

export const EMAIL = [
  "alex.rivera@gmail.com",
  "sarah.j.smith@outlook.com",
  "m.chen.dev@yahoo.com",
  "jordan.taylor92@icloud.com",
  "claire.vanderbilt@protonmail.com",
  "root@localhost.dev",
  "test-user-01@sandbox.io",
  "admin@company-portal.net",
  "api.tester@endpoint.solutions",
  "bug_hunter@qa-triage.com",
  "constantine.alexander.maximilian@university-records.edu",
  "bobby.tables-drop-database@security-audit.org",
  "info-department-west-region-04@global-logistics-corp.biz",
  "user.name+extra.tag.123@subdomain.provider.co.uk",
  "k.seang.dev.testing.account@internal-workflow.systems",
  "a@b.com",
  "dev@me.io",
  "hi@xyz.net",
  "test@123.org",
  "go@run.dev",
];

export const PHONE_NUMBERS = [
  "+1 (555) 234-5678",
  "+1 (212) 867-5309",
  "+1 (310) 555-0142",
  "+855 12 345 678",
  "+855 96 789 0123",
  "+855 70 456 789",
  "+44 20 7946 0958",
  "+61 2 8765 4321",
  "(023) 456-789",
  "012 987 654",
  "077 555 1234",
  "098 765 4321",
];

export const STREET_ADDRESSES = [
  "742 Evergreen Terrace",
  "221B Baker Street",
  "1600 Pennsylvania Avenue NW",
  "350 Fifth Avenue, Suite 3400",
  "12 Elm Street, Apt 4B",
  "88 Preah Sihanouk Blvd",
  "56 Street 63, Sangkat Boeung Keng Kang",
  "123 Mao Tse Toung Blvd",
  "27 Russian Federation Blvd",
  "99 Norodom Boulevard",
  "1455 Market Street, Floor 6",
  "8 Rue de la Paix",
];

export const CITIES = [
  "Phnom Penh", "Siem Reap", "Battambang", "Sihanoukville",
  "New York", "Los Angeles", "San Francisco", "Chicago",
  "London", "Tokyo", "Sydney", "Singapore",
  "Ho Chi Minh City", "Kuala Lumpur", "Jakarta",
];

export const COUNTRIES = [
  "Cambodia", "United States", "United Kingdom", "Australia",
  "Japan", "Singapore", "Vietnam",
  "Canada", "Germany", "France", "South Korea",
];

export const STATES_PROVINCES = [
  "California", "New York", "Texas", "Florida",
  "Phnom Penh", "Siem Reap", "Battambang", "Kampong Cham",
  "Ontario", "Queensland", "Bavaria", "Île-de-France",
];

export const JOB_TITLES = [
  "Software Engineer", "Product Manager", "Data Analyst",
  "UX Designer", "DevOps Engineer", "Marketing Specialist",
  "Project Coordinator", "Business Analyst", "QA Engineer",
  "Frontend Developer", "Backend Developer", "Full Stack Developer",
  "System Administrator", "Technical Lead", "Operations Manager",
];

export const WEBSITES = [
  "https://example.com",
  "https://johndoe-portfolio.dev",
  "https://mycompany.com",
  "https://github.com/testuser",
  "https://linkedin.com/in/testprofile",
  "https://blog.testsite.io",
];

export const USERNAMES = [
  "cooldev_42", "alex.r2024", "jordan_taylor", "techsavvy99",
  "pixel_ninja", "code_master_x", "sunny_coder", "dev_storm",
  "quantum_leap", "byte_rider", "nova_spark", "echo_wave",
];

export const LOREM_PARAGRAPHS = [
  "This is a sample text entry for testing purposes. It contains enough content to simulate a realistic form submission with meaningful data that can be reviewed by QA teams.",
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.",
  "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the English alphabet and is commonly used for testing text rendering and form validation.",
  "Thank you for your prompt response regarding our recent inquiry. We would like to schedule a follow-up meeting to discuss the proposed changes in detail.",
  "Please find attached the quarterly report for Q3 2025. Key highlights include a 15% increase in user engagement and successful deployment of the new dashboard feature.",
  "I am writing to express my interest in the position advertised on your website. With over 5 years of experience in software development, I believe I would be a strong fit for your team.",
];