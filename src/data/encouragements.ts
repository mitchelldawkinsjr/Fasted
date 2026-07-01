import type { CustomPhaseContent, FastType } from '../types';

type DayKind = 'fast' | 'prep' | 'extended-prayer';

type PhaseEncouragements = Record<DayKind, string[]>;

/** Christ-centered encouragement pools keyed by fasting phase and day type. */
const PHASE_ENCOURAGEMENTS: Record<number, PhaseEncouragements> = {
  1: {
    fast: [
      'Daniel chose simplicity so his heart could stay clear before God. Today your fast is not about weakness—it is about making room for wisdom.',
      'On this fast day, let hunger remind you to pray for wisdom in every health decision you face.',
      'God sees your dedication today—the same heart that says yes to discipline is the heart He can lead as a family leader.',
      'Like Daniel’s ten days of vegetables and water, small faithful choices build a life surrendered to God.',
      'You do not need to prove anything today. Return your heart to God one sip of water, one prayer at a time.',
      'Daniel 1:12 is an invitation to simplicity. Let today’s fast teach your body to listen when your spirit is speaking.',
      'When cravings rise, pray for your family instead of fighting alone. Leadership starts in secret obedience.',
      'Water-only today is enough. God is not measuring your performance—He is drawing your heart near.',
      'Every Wednesday fast is a reset: less noise, more wisdom, more room for the Lord to guide your health.',
      'You started this journey for a reason. Let today’s hunger reconnect you to why you said yes to God.',
    ],
    prep: [
      'Daniel 1 teaches us that ordinary days of obedience prepare us for extraordinary trust. Eat with gratitude and pray for wisdom today.',
      'This preparation day is part of the fast. Honor God in what you eat and how you lead your family.',
      'Remove what distracts, keep what nourishes. God is shaping your health journey and your heart together.',
      'Between fast days, stay attentive. Consistency in small choices is still worship when your heart is surrendered.',
      'Pray today for wisdom over your body, your home, and the people God has placed in your care.',
      'Lean protein, vegetables, fruit, water—simple food for a surrendered life. Thank God for provision today.',
      'Skipping soda and fast food is still fasting in spirit. Celebrate the small wins without pride.',
      'Use a normal eating day to prepare spiritually for Wednesday. Ask the Lord to strengthen your resolve.',
      'Your weight-loss journey is also a worship journey. Invite God into every meal and every choice.',
      'Family leadership is built in daily moments. Pray over your home today, not just over your plate.',
    ],
    'extended-prayer': [],
  },
  2: {
    fast: [
      'David lay on the floor and prayed through the night. Your fast today is an invitation to seek God with the same honest hunger.',
      'Let Psalm 51 soften your heart today—God is near to the brokenhearted and draws close when you seek Him in fasting.',
      'Healing begins in honest prayer. This fast day is not punishment; it is making space for emotional renewal.',
      'When your body feels empty, fill your spirit with Psalm 23. The Lord is your shepherd—you lack nothing you truly need.',
      'Physical discipline paired with prayer opens the door for healing God wants to work in you.',
      'David did not fast to earn love—he fasted because his heart was broken and he needed God. Come as you are.',
      'Black coffee or tea today is a tool, not the point. The point is seeking the Lord with your whole heart.',
      'Emotional renewal often starts with stillness. Let this fast quiet the noise so you can hear God’s comfort.',
      'Psalm 103 says God forgives and heals. Pray that over the places in you that still feel wounded.',
      'Wednesday and Friday fasts are rhythm, not ritual. Each one is a fresh invitation to draw near.',
    ],
    prep: [
      'Between fast days, let Psalm 103 fill your mind: bless the Lord for healing, forgiveness, and renewed strength.',
      'David sought God in crisis. Use today to read the Psalms and ask the Lord for emotional renewal.',
      'Preparation days matter. Rest, read scripture, and let God prepare your heart for the next time you fast.',
      'Healing is often gradual. Stay faithful in prayer today even when you are not fasting from food.',
      'Psalm 23, 51, and 103 are companions for this phase. Let one of them guide your prayers today.',
      'You do not have to feel healed to pray for healing. Bring your honest heart and let God meet you there.',
      'Physical discipline grows on prep days too—sleep, scripture, and gentle choices still honor the Lord.',
      'If emotions feel heavy today, the Psalms give you words when yours run out. Read one slowly.',
      'God is renewing you from the inside out. Trust the process even when progress feels invisible.',
      'Tomorrow or the next fast day will come. Use today to rest in the Shepherd who leads you.',
    ],
    'extended-prayer': [],
  },
  3: {
    fast: [
      'Daniel waited three weeks for an answer. Your Daniel Fast days are not wasted—breakthrough often grows in quiet perseverance.',
      'You are setting aside comfort to make room for God. Pray boldly today for spiritual breakthrough in your family and calling.',
      'Every simple meal today is an act of trust: God sees what you are seeking more than what you are skipping.',
      'Daniel did not eat rich food so he could hear clearly. Let today’s hunger turn your attention toward heaven.',
      'This 21-day journey is building something in you. Ask God for direction in work, ministry, and the people you love.',
      'Day by day, Daniel’s fast weakened his flesh and sharpened his spirit. Trust the same pattern in your life.',
      'When you miss old comforts, remember what you are gaining: clarity, dependence, and nearness to God.',
      'Breakthrough for your family may start with your faithfulness today. Keep praying even without visible results.',
      'Beans, rice, and vegetables are humble food for a holy purpose. God honors consecrated simplicity.',
      'You are not alone in this 21-day stretch. The same God who answered Daniel hears your prayers now.',
    ],
    prep: [
      'Daniel mourned and waited. Even on full Daniel Fast eating days, you are still saying yes to God over appetite.',
      'Breakthrough rarely arrives on our schedule. Stay patient and keep praying for your family and your purpose.',
      'Each day of this fast strengthens your spirit. Eat gratefully and intercede for the doors God is opening.',
      'You do not need a dramatic sign today. Faithful obedience in ordinary meals still honors the Lord.',
      'Ask the Holy Spirit to guide your work and ministry while your body stays consecrated to this season.',
      'Spiritual breakthrough often looks like showing up again. You are doing that today—keep going.',
      'Pray specifically for one family member today. Daniel interceded for his people; you can intercede for yours.',
      'Work and ministry direction comes in pieces. Write down what God puts on your heart, even if it is small.',
      'Avoid comparing your Daniel Fast to someone else’s. Your obedience before God is enough.',
      'This phase is forming hunger for God that outlasts the menu. Let that be your deepest aim.',
    ],
    'extended-prayer': [],
  },
  4: {
    fast: [
      'Joel 2 calls us to return with all our heart. Today’s fast is an honest turning—not guilt, but grace drawing you home.',
      'Repentance is not self-hatred. It is choosing God again. Let this fast day soften your heart before Him.',
      'Return, even if you feel far. God runs toward a heart that comes back with fasting and prayer.',
      'Read Joel 2 today and let revival begin in your own soul before you ask it of anyone else.',
      'Holiness grows in humble moments like this. One surrendered fast day can spark more than you expect.',
      'Rend your heart, not your garments—Joel’s call is inward. Let God do deep work while you fast.',
      'Monday and Thursday fasts anchor this phase. Each one is a fresh start, not a scorecard.',
      'Revival is God’s work; returning is yours. You showed up today—that is the right response.',
      'Confess honestly, then receive mercy fully. God is not waiting to condemn you.',
      'Holiness is not perfection—it is a heart that keeps turning toward the Lord. Stay turned today.',
    ],
    prep: [
      'Joel says return with all your heart. Use today to read Joel 2 and invite the Lord to search your motives.',
      'Revival starts privately before it spreads publicly. Pray for holiness in the quiet of this preparation day.',
      'You do not have to be perfect to return to God. You only have to come honestly.',
      'Between fast days, stay tender toward the Spirit. Repentance is a lifestyle, not a single event.',
      'Ask God to revive your prayer life, your relationships, and your hunger for what honors Him.',
      'Joel 2 speaks of God’s mercy before judgment. Rest in His kindness as you prepare for the next fast.',
      'If you stumbled yesterday, today is still open. Grace is wider than your last mistake.',
      'Pray for revival in your church, your city, and your home—but let it begin in you.',
      'Holiness shows up in how we treat people. Look for one way to honor God in relationship today.',
      'Reading Joel 2 daily keeps your heart aligned. Even five minutes in scripture counts.',
    ],
    'extended-prayer': [],
  },
  5: {
    fast: [
      'Isaiah 58 reminds us that true fasting loosens chains and feeds the hungry. Today, fast and ask how you can serve someone in need.',
      'God’s chosen fast includes compassion. Let your empty stomach remind you to look for one person to encourage today.',
      'Healing and kingdom impact often start with one act of mercy. Pray for eyes to see who needs you this week.',
      'This fast is worship when it leads to love in action. Ask God for a generous heart alongside a disciplined body.',
      'Isaiah 58 promises light and healing when we serve others. Trust that your obedience today is not in vain.',
      'Your light can rise in obscurity when you live Isaiah 58. Fast today with someone else in mind.',
      'Break your fast gently, then look for a practical way to share what you have.',
      'Compassion is not optional in this phase—it is part of the fast God chose.',
      'Pray for healing in your body and healing in your community. Both matter to the Lord.',
      'Wednesday fasts reset your focus from self to service. Let that shift happen in your heart today.',
    ],
    prep: [
      'Isaiah 58 is a living fast—give, serve, encourage. Look for one practical way to bless someone today.',
      'Compassion is part of this phase. Pray for healing in your life and for courage to impact someone else’s.',
      'Not every day is a food fast, but every day can be a kingdom day. Who can you feed, help, or uplift?',
      'God cares about justice and mercy. Let your preparation day include one small act of service.',
      'Kingdom impact often looks ordinary: a meal shared, a word spoken, a need met. Ask God to show you one step.',
      'This week’s assignment still stands: give, encourage, serve. Pick one if you have not yet.',
      'Healing often flows through community. Reach out to someone who may feel alone today.',
      'You are learning that fasting and generosity belong together. That is mature faith.',
      'Isaiah 58 rebukes empty religion. Let your prep day be full of genuine love in action.',
      'Pray: “Lord, show me one person today.” Then act on what He puts on your heart.',
    ],
    'extended-prayer': [],
  },
  6: {
    fast: [
      'You have walked this Daniel road before. Endurance is built by showing up again—God honors second journeys.',
      'Daniel’s discipline was tied to vision. Pray today for the future God is shaping in your body and spirit.',
      'Physical transformation and spiritual endurance grow together. Take your walk today as a prayer in motion.',
      'The middle of a long fast tests the heart. You are stronger than you feel because grace is carrying you.',
      'Keep your eyes on the vision ahead. This season is preparing you for what God wants to do next.',
      'Second time through is not second best. God is deepening what He started the first time.',
      'When motivation dips, remember your future vision. Endurance is love for tomorrow’s self.',
      'Your daily walk is a declaration: I will not quit. Even fifteen minutes with Jesus counts.',
      'Physical transformation takes time. Celebrate discipline itself as a gift from the Spirit.',
      'Daniel waited in weakness and received strength. Your waiting is not wasted.',
    ],
    prep: [
      'Endurance is choosing again when motivation fades. Eat simply, walk faithfully, and trust the process God is writing.',
      'Your body is changing, but so is your character. Thank God today for how far He has brought you.',
      'Daniel waited with purpose. Use this preparation day to pray for vision beyond this 21-day stretch.',
      'Transformation is rarely loud. Small daily obedience is how God rebuilds us from the inside out.',
      'Take your daily walk as worship—movement that says you believe God has more for you in 2027 and beyond.',
      'You know the Daniel Fast rhythm now. Lean into wisdom gained from the first round.',
      'Future vision needs daily faithfulness. What you do today echoes into next year.',
      'Thank God for one visible change and one invisible change He is working in you.',
      'Do not rush the process. God is more interested in who you become than how fast you arrive.',
      'Walk, pray, eat simply—three quiet acts that keep endurance alive between harder days.',
    ],
    'extended-prayer': [],
  },
  7: {
    fast: [
      'Esther said, “If I perish, I perish.” Your fast today is an act of courage—trust God with what you cannot control.',
      'Courage is not the absence of fear. It is fasting, praying, and stepping forward anyway.',
      'God prepares people in hidden seasons. This fast is part of your Esther moment—stay faithful in the waiting.',
      'Hydrate wisely, pray deeply, and trust that the Lord who placed you here will provide for this step.',
      'When the stakes feel high, lean into faith. God honors hearts that seek Him before they act.',
      'Esther did not act alone—her community fasted with her. You are part of a larger story of prayer.',
      'A 24-hour or sunset fast is serious. Honor your body, follow safety guidance, and stay close to the Lord.',
      'Courage grows when you choose God over comfort. Today is one of those choosing days.',
      'Trust His provision before you see it. Esther stepped forward after prayer, not before.',
      'Your “for such a time as this” moment may be closer than you think. Stay ready in prayer.',
    ],
    prep: [
      'Esther prepared before she approached the king. Use today to rest, pray, and trust God’s timing for what is ahead.',
      'Courage grows in preparation. You are not idle—you are being readied for whatever God is calling you to face.',
      'Between fasts, nourish your body and strengthen your faith. Provision often arrives after obedience, not before.',
      'Trust does not mean careless—it means faithful. Prepare well and keep your heart fixed on the Lord.',
      'Pray for courage today even if no fast is required. God is forming a steadfast spirit in you.',
      'Esther’s story reminds us: preparation days are holy too. Rest is part of the battle plan.',
      'If fear whispers today, answer with scripture and prayer. Faith speaks louder over time.',
      'God’s provision often shows up through wise preparation. Honor both spirit and body.',
      'You may not know what you are being prepared for. Trust the One who does.',
      'Keep a soft heart and a steady pace. Courage is built day by day, not in one leap.',
    ],
    'extended-prayer': [],
  },
  8: {
    fast: [
      'As the year closes, consecrate this fast day to gratitude. Thank God for what He has carried you through.',
      'Isaiah 58, Psalm 103, Matthew 6, James 5—let today’s reading draw you into worship, not hurry.',
      'Fasting at year’s end clears space to hear God’s vision for the days ahead. Pray for your family and for 2027.',
      'Gratitude and fasting belong together: less clutter, more room to bless the Lord for His mercy.',
      'You are finishing strong, not perfectly. God sees a heart that keeps returning to Him.',
      'Monday and Thursday fasts frame this consecration season. Each one clears noise for God’s voice.',
      'Psalm 103: bless the Lord and forget not His benefits. Name them aloud today.',
      'Matthew 6: seek first the kingdom. Let that order guide your prayers while you fast.',
      'James 5: the prayer of a righteous person is powerful. Believe that as you intercede today.',
      'The year is ending, but God’s faithfulness is not. Build on what He has done.',
    ],
    prep: [
      'Consecration is daily attention to God. Read today’s passages and ask what He wants to heal before the year ends.',
      'Gratitude turns ordinary days into worship. Name three mercies before you name three worries.',
      'Pray for your family today and for the vision God is planting for 2027. He is not finished with you.',
      'Matthew 6 reminds us to seek first the kingdom. Let that be the center of this closing season.',
      'James 5 calls us to patient, praying faith. Stay steady—you are being prepared for what comes next.',
      'Use a non-fast day to journal what God taught you this year. Reflection is consecration too.',
      'Healing prayers still belong in December. Ask the Lord to mend what remains tender.',
      'Family gratitude goes far—tell someone you love why you thank God for them today.',
      'Vision for 2027 starts with surrender in 2026. Offer the last weeks of this year to Him.',
      'You do not need a perfect year-end. You need an honest heart that keeps seeking God.',
    ],
    'extended-prayer': [
      'Today is for extended prayer, not rushing. Set aside unhurried time to worship, listen, and intercede.',
      'Saturday consecration is a gift—no food fast required, but a deeper yes to being with God.',
      'Let Isaiah 58 and Psalm 103 frame your prayer time. Ask the Lord to heal what still needs mending.',
      'Vision for 2027 is born in quiet prayer. Give God space to speak before you plan the year ahead.',
      'Extended prayer is worship with your schedule surrendered. Show up without agenda and see what He places on your heart.',
      'Turn off distractions for one block of time. Presence is the point of this Saturday.',
      'Worship first, requests second. Let praise set the tone for your extended prayer.',
      'Intercede for your family by name. Long prayer lists are fine, but love is in the specifics.',
      'Listen more than you speak. Consecration includes waiting on the Lord.',
      'End your prayer time with gratitude. However the hour went, thank God you showed up.',
    ],
  },
};

const GENERIC_ENCOURAGEMENTS = [
  'Today is not about proving yourself. It is about returning your heart to God one decision at a time.',
  'Consistency is a form of worship when your heart is surrendered.',
  'You do not need a perfect day. You need an honest day with God.',
  'Small obedience still matters.',
  'Let hunger become a reminder to pray, not a reason to quit.',
  'Grace covers what discipline cannot finish.',
  'Mercy is new this morning, and so is your chance to begin again.',
  'Keep your eyes on Jesus, not on the clock.',
];

function dateHash(date: string, salt = 0): number {
  return date.split('').reduce((acc, char) => acc + char.charCodeAt(0), salt);
}

function getDayKind(isFastDay: boolean, fastType: FastType): DayKind {
  if (isFastDay) return 'fast';
  if (fastType === 'extended-prayer') return 'extended-prayer';
  return 'prep';
}

export function getEncouragementForDay(
  date: string,
  phaseId: number,
  isFastDay: boolean,
  fastType: FastType,
): string {
  const kind = getDayKind(isFastDay, fastType);
  const phasePool = PHASE_ENCOURAGEMENTS[phaseId];
  const messages =
    phasePool?.[kind]?.length
      ? phasePool[kind]
      : phasePool?.prep.length
        ? phasePool.prep
        : GENERIC_ENCOURAGEMENTS;

  return messages[dateHash(date) % messages.length];
}

export function getCustomPhaseEncouragement(
  date: string,
  content: CustomPhaseContent,
  dayIndex: number,
  isFastDay: boolean,
  fastType: FastType,
): string {
  const prayerFocus = content.prayerFocus.length ? content.prayerFocus : ['today’s focus'];
  const focus = prayerFocus[dateHash(date, dayIndex) % prayerFocus.length];
  const dayLabel = dayIndex + 1;
  const title = content.title || 'this phase';

  if (isFastDay) {
    return `Day ${dayLabel} of ${title}: let today’s fast make room to pray over ${focus.toLowerCase()}.`;
  }

  if (fastType === 'extended-prayer') {
    return `Day ${dayLabel} of ${title}: set aside unhurried prayer for ${focus.toLowerCase()} today.`;
  }

  return `Day ${dayLabel} of ${title}: stay attentive to God as you pray over ${focus.toLowerCase()}.`;
}

export const CHECK_IN_CELEBRATIONS = [
  'You showed up today. Small obedience still counts.',
  'Well done. Faithfulness in one day builds a lifetime of trust.',
  'God sees your heart. Keep going gently.',
  'Another step forward. Grace is carrying you.',
  'You chose obedience today. That is beautiful.',
];

export function getCelebrationMessage(date: string): string {
  return CHECK_IN_CELEBRATIONS[dateHash(date, 7) % CHECK_IN_CELEBRATIONS.length];
}
