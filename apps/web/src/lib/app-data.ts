export const user = {
  name: "Julian Vance",
  firstName: "Julian",
  username: "julian.v",
  role: "Level 24 Architect",
  level: 24,
  xp: 2450,
  streak: 12,
  email: "julian.vance@questoriaa.app",
  bio: "AI Researcher and aspiring Neural Architect. Currently mastering Transformers and spatial computing logic. Level 24 on Questoriaa.",
  website: "https://yourportfolio.com",
  avatar:
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&h=200&q=80",
};

export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "layout-grid" },
  { href: "/library", label: "Library", icon: "book-open" },
  { href: "/quests", label: "Quests", icon: "target" },
  { href: "/mastery", label: "Mastery", icon: "award" },
  { href: "/community", label: "Community", icon: "users" },
  { href: "/achievements", label: "Achievements", icon: "trophy" },
  { href: "/settings", label: "Settings", icon: "settings" },
] as const;

export const searchPlaceholders: Record<string, string> = {
  "/dashboard": "Search courses, docs, or community...",
  "/library": "Search resources, tags, or authors...",
  "/quests": "Search quest log or missions...",
  "/mastery": "Search mastery levels, skills...",
  "/settings": "Search settings...",
  "/community": "Search community...",
  "/achievements": "Search achievements...",
};

export const learningPaths = [
  {
    id: "neural",
    title: "Advanced Neural",
    subtitle: "Currently on: Transformers & Attention Mechanisms",
    progress: 68,
    when: "2H AGO",
    tone: "wave" as const,
  },
  {
    id: "data",
    title: "Data Science Mastery",
    subtitle: "Currently on: Exploratory Data Analysis",
    progress: 42,
    when: "YESTERDAY",
    tone: "dark" as const,
  },
  {
    id: "ui",
    title: "Creative UI Design",
    subtitle: "Currently on: Micro-interactions",
    progress: 15,
    when: "3 DAYS AGO",
    tone: "fluid" as const,
  },
];

export const dailyQuests = [
  { title: "Morning Logic Ritual", xp: 250, done: true },
  { title: "Complete 3 AI Dialogues", xp: 500, done: false },
  { title: "Review Spatial Notes", xp: 150, done: false },
];

export const leaderboard = [
  { rank: 1, name: "Alex Rivera", xp: "42,500 XP", highlight: false },
  { rank: 2, name: "Sarah Jenkins", xp: "38,200 XP", highlight: true },
  { rank: 3, name: "Marcus Thorne", xp: "37,900 XP", highlight: false },
  { rank: 4, name: "Elena Rossi", xp: "35,400 XP", highlight: false },
];

export const recentAchievements = [
  { title: "Deep Thinker 1", detail: "50 Dialogues with AI" },
  { title: "Deep Thinker 2", detail: "50 Dialogues with AI" },
  { title: "Deep Thinker 3", detail: "50 Dialogues with AI" },
  { title: "Deep Thinker 4", detail: "50 Dialogues with AI" },
];

export const performanceMetrics = [
  { label: "Logical Reasoning", value: "92%" },
  { label: "Critical Synthesis", value: "78%" },
  { label: "Neural Retention", value: "84%" },
  { label: "Spatial Awareness", value: "65%" },
];

export const weekDays = ["DAY 1", "DAY 2", "DAY 3", "DAY 4", "DAY 5", "DAY 6", "DAY 7"];

export const libraryCategories = [
  { id: "all", label: "All Resources", count: 129, icon: "layers" },
  { id: "neural", label: "Neural Networks", count: 42, icon: "brain" },
  { id: "data", label: "Data Science", count: 28, icon: "database" },
  { id: "design", label: "Design Systems", count: 19, icon: "pen-tool" },
  { id: "spatial", label: "Spatial Computing", count: 12, icon: "box" },
  { id: "favorites", label: "Favorites", count: 8, icon: "star" },
  { id: "archives", label: "Recent Archives", count: 4, icon: "archive" },
] as const;

export const folders = [
  { title: "Research Papers", items: "12 Items", color: "text-pink" },
  { title: "Project Briefs", items: "8 Items", color: "text-cyan" },
  { title: "AI Tutor Transcripts", items: "45 Items", color: "text-text" },
  { title: "Spatial Archives", items: "5 Items", color: "text-text" },
];

export const curatedPaths = [
  {
    id: "1",
    title: "Transformer Architecture",
    category: "Neural Networks",
    xp: 450,
    author: "Dr. Ada Thorne",
    time: "8h 20m",
    tag: "neural",
    art: "circuit" as const,
    blurb: "A comprehensive study of attention mechanisms and self-attention in.",
  },
  {
    id: "2",
    title: "Advanced Data",
    category: "Data Science",
    xp: 600,
    author: "Sarah Jenkins",
    time: "12h 10m",
    tag: "data",
    art: "project" as const,
    blurb: "Master complex data structuring techniques using applied CI and.",
  },
  {
    id: "3",
    title: "Micro-Interaction Design",
    category: "Design Systems",
    xp: 300,
    author: "Julian Vance",
    time: "4h 45m",
    tag: "design",
    art: "guide" as const,
    blurb: "Developing high-fidelity UI animations and state-driven patterns.",
  },
  {
    id: "4",
    title: "Spatial Computing",
    category: "Spatial Computing",
    xp: 500,
    author: "Alex Rivera",
    time: "9h 10m",
    tag: "spatial",
    art: "spatial" as const,
    blurb: "Exploring the intersection of AR/VR and decentralized data storage.",
  },
  {
    id: "5",
    title: "Logic Ritual: Advanced",
    category: "Mathematics",
    xp: 250,
    author: "System AI",
    time: "45m",
    tag: "favorites",
    art: "ritual" as const,
    blurb: "Daily mental exercises focusing on deductive applications in machine.",
  },
  {
    id: "6",
    title: "Neural Synthesis &",
    category: "Neural Networks",
    xp: 250,
    author: "Elena Rossi",
    time: "1h 30m",
    tag: "neural",
    art: "web" as const,
    blurb: "Understanding the biological foundations of human learning versus.",
  },
];

export const dailyChallenges = [
  {
    id: "logic",
    badge: "DAILY LOGIC",
    title: "The Logic Circuit",
    description: "Complete 3 advanced reasoning modules without a single hint.",
    xp: 400,
    progress: 100,
    status: "completed" as const,
    extra: "COMPLETED",
  },
  {
    id: "research",
    badge: "DAILY RESEARCH",
    title: "Neural Synthesis",
    description: "Summarize a research paper using the AI Tutor and link 5 concepts.",
    xp: 800,
    progress: 60,
    status: "active" as const,
  },
  {
    id: "sprint",
    badge: "DAILY ENGAGEMENT",
    title: "Focus Sprint",
    description: "Maintain a 45-minute deep work session in the focus lab.",
    xp: 200,
    progress: 20,
    status: "active" as const,
  },
];

export const weeklyCampaigns = [
  {
    id: "architect",
    badge: "WEEKLY QUEST • CHALLENGE",
    title: "Master Architect",
    description: 'Complete the entire "Advanced Neural Architectures" course sequence.',
    xp: 2500,
    progress: 85,
    meta: "BADGE REWARD Rare Badge",
    accent: "pink" as const,
  },
  {
    id: "mentor",
    badge: "WEEKLY QUEST • COMMUNITY",
    title: "Community Mentor",
    description: "Answer 10 questions in the community forum with helpful citations.",
    xp: 1200,
    progress: 40,
    meta: "TITLE REWARD Mentor Frame",
    accent: "cyan" as const,
  },
  {
    id: "polymath",
    badge: "WEEKLY QUEST • DISCOVERY",
    title: "The Polymath",
    description: "Engage with content across 4 different subject libraries.",
    xp: 1000,
    progress: 75,
    meta: "TITLE REWARD Pro Title",
    accent: "cyan" as const,
  },
];

export const rewards = [
  {
    id: "wings",
    title: "Obsidian Wings",
    cost: "5,000 XP",
    state: "unlocked" as const,
    art: "wings" as const,
  },
  {
    id: "frame",
    title: "Neon Pulse Frame",
    cost: "12,000 XP",
    state: "locked" as const,
    art: "frame" as const,
  },
  {
    id: "thinker",
    title: "Deep Thinker 2.0",
    cost: "8,500 XP",
    state: "locked" as const,
    art: "thinker" as const,
  },
];

export const skillTrees = [
  {
    title: "Cognitive Core",
    tier: "Level 10 Core Tier",
    mastered: true,
    skills: [
      { name: "Symbolic Logic", value: "94%", done: true },
      { name: "Memory Anchoring", value: "100%", done: true },
      { name: "Pattern Synthesis", value: "22%", done: false },
    ],
  },
  {
    title: "Neural Engineering",
    tier: "Level 6 Core Tier",
    mastered: false,
    skills: [
      { name: "Transformer Architecture", value: "68%", done: false },
      { name: "Attention Mechanisms", value: "45%", done: false },
      { name: "Hyperparameter Tuning", value: "15%", done: false },
    ],
  },
  {
    title: "Interface Systems",
    tier: "Level 0 Core Tier",
    mastered: false,
    skills: [
      { name: "Micro-Interactions", value: "0%", done: false },
      { name: "Design Tokens", value: "0%", done: false },
      { name: "Motion Logic", value: "0%", done: false },
    ],
  },
];

export const masteryActivity = [
  { title: "Mastered Transformer", time: "7h ago", xp: "+250 XP", icon: "check" },
  { title: "Unlocked Neural Engin", time: "Yesterday", xp: "+1,200 XP", icon: "star" },
  { title: "Achieved Logic Streak", time: "3 days ago", xp: "+600 XP", icon: "flame" },
  { title: "Improved Spatial Aware", time: "4 days ago", xp: "+150 XP", icon: "eye" },
  { title: "Weekly Ritual Comple", time: "1 week ago", xp: "+800 XP", icon: "calendar" },
];

export const eliteMilestones = [
  { title: "Elite Mind 1", tone: "cyan" as const },
  { title: "Elite Mind 2", tone: "pink" as const },
  { title: "Elite Mind 3", tone: "cyan" as const },
  { title: "Elite Mind 4", tone: "pink" as const },
];
