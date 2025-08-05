import { GameResult } from "../../interfaces";

const SUITS = ['S', 'H', 'D', 'C'] as const;
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;

type Suit = typeof SUITS[number];
type Rank = typeof RANKS[number];

interface Card {
    rank: Rank;
    suit: Suit;
}

type Hand = [Card, Card, Card];

type HandType = 'high-card' | 'pair' | 'flush' | 'straight' | 'straight-flush' | 'trio';

const HAND_RANK_ORDER: Record<HandType, number> = {
    'high-card': 1,
    'pair': 2,
    'flush': 3,
    'straight': 4,
    'straight-flush': 5,
    'trio': 6,
};

function createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ rank, suit });
        }
    }
    return deck;
}

function shuffle(deck: Card[]): Card[] {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function rankValue(card: Card): number {
    return RANKS.indexOf(card.rank);
}

function getHandType(cards: Hand): HandType {
    const values = cards.map(rankValue).sort((a, b) => a - b);
    if (values[0] == 0 && values[1] == 1 && values[2] == 12) values[2] = 2;
    const suits = cards.map(card => card.suit);
    const isFlush = suits.every(suit => suit === suits[0]);
    const isStraight = values[2] - values[0] === 2 && new Set(values).size === 3;
    const isPair = new Set(values).size === 2;
    const isTrio = new Set(values).size === 1;

    if (isTrio) return 'trio';
    if (isStraight && isFlush) return 'straight-flush';
    if (isStraight) return 'straight';
    if (isFlush) return 'flush';
    if (isPair) return 'pair';
    return 'high-card';
}

function compareHands(handA: Hand, handB: Hand): 'Player A' | 'Player B' | 'tie' {
    const typeA = getHandType(handA);
    const typeB = getHandType(handB);
    const rankA = HAND_RANK_ORDER[typeA];
    const rankB = HAND_RANK_ORDER[typeB];

    if (rankA < rankB) return 'Player A';
    if (rankB < rankA) return 'Player B';

    const valuesA = handA.map(rankValue).sort((a, b) => b - a);
    const valuesB = handB.map(rankValue).sort((a, b) => b - a);

    if (typeA === 'pair' || typeA === 'trio') {
        const getRepeatedValue = (values: number[]): number => {
            const countMap: Record<number, number> = {};
            for (const val of values) {
                countMap[val] = (countMap[val] || 0) + 1;
            }
            return +Object.keys(countMap).find(k => countMap[+k] > 1)!;
        };

        const pairValA = getRepeatedValue(valuesA);
        const pairValB = getRepeatedValue(valuesB);

        if (pairValA < pairValB) return 'Player A';
        if (pairValB < pairValA) return 'Player B';
        if (pairValA == pairValB) {
            for (let i = 0; i < 3; i++) {
                if (valuesA[i] < valuesB[i]) return 'Player A';
                if (valuesB[i] < valuesA[i]) return 'Player B';
            }
        }
    } else {
        for (let i = 0; i < 3; i++) {
            if (valuesA[i] < valuesB[i]) return 'Player A';
            if (valuesB[i] < valuesA[i]) return 'Player B';
        }
    }

    const suitPriority: Record<Suit, number> = {
        'D': 1,
        'C': 2,
        'H': 3,
        'S': 4,
    };

    const minSuitA = Math.min(...handA.map(card => suitPriority[card.suit]));
    const minSuitB = Math.min(...handB.map(card => suitPriority[card.suit]));

    if (minSuitA < minSuitB) return 'Player A';
    if (minSuitB < minSuitA) return 'Player B';

    const sortedHandA = handA.sort((a, b) => rankValue(b) - rankValue(a));
    const sortedHandB = handB.sort((a, b) => rankValue(b) - rankValue(a));

    if (suitPriority[sortedHandA[0].suit] < suitPriority[sortedHandB[0].suit]) return 'Player A';
    if (suitPriority[sortedHandB[0].suit] < suitPriority[sortedHandA[0].suit]) return 'Player B';

    return 'tie';
};

export function dealGame(): GameResult {
    const deck = shuffle(createDeck());
    const handA: Hand = [deck[0], deck[1], deck[2]];
    const handB: Hand = [deck[3], deck[4], deck[5]];

    const winner = compareHands(handA, handB);

    return {
        1: handA.map(e => `${e.rank}-${e.suit}`),
        2: handB.map(e => `${e.rank}-${e.suit}`),
        winner: winner === 'Player A' ? 1 : 2,
    };
};
