import { IResult, TCard, THandType, THandTypeResult } from "../../interfaces";

const suits = ['H', 'S', 'C', 'D'];

function createDeck(): TCard[] {
    const deck: TCard[] = [];
    for (let suit of suits) {
        for (let num = 2; num <= 14; num++) {
            deck.push({ suit, num });
        }
    };
    return deck
};

function shuffleDeck(deck: TCard[]): TCard[] {
    for (let j = deck.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [deck[j], deck[k]] = [deck[k], deck[j]];
    }
    return deck
}

const toCardString = (c: TCard) => `${c.suit}${c.num}`;

function getHandTypes(hand: TCard[]): THandTypeResult {

    const sortedHand = [...hand].sort((a, b) => a.num - b.num);

    const [card1, card2, card3] = sortedHand;
    const flush = card1.suit === card2.suit && card2.suit === card3.suit;
    const straight = card2.num === card1.num + 1 && card3.num === card2.num + 1;
    const threeOfKindAce = card1.num === 1 && card2.num === 1 && card3.num === 1;
    const threeOfKind = card1.num === card2.num && card2.num === card3.num;
    const pair = card1.num === card2.num || card2.num === card3.num || card1.num === card3.num;
    const straightFlush = flush && straight;

    let handType: THandType = 'high_card';
    let winningCards: TCard[] = [];

    if (threeOfKindAce) {
        handType = 'three_of_kind_ace';
        winningCards = sortedHand;
    }
    else if (threeOfKind) {
        handType = 'three_of_a_kind';
        winningCards = sortedHand;
    }
    else if (straightFlush) {
        handType = 'straight_flush';
        winningCards = sortedHand;
    }
    else if (straight) {
        handType = 'straight';
        winningCards = sortedHand;
    }
    else if (flush) {
        handType = 'flush';
        winningCards = sortedHand;
    }
    else if (pair) {
        handType = 'pair';
        const pairValue = card1.num === card2.num ? card1.num :
            (card2.num === card3.num ? card2.num : card1.num);
        winningCards = sortedHand.filter(card => card.num === pairValue);
    }
    else {
        winningCards = [sortedHand[sortedHand.length - 1]];
    }
    const winCards = winningCards.map(toCardString)
    const remainingCards = hand.filter(e => !winCards.includes(toCardString(e)))
    return {
        handType,
        winningCards: winCards,
        remainingCards: remainingCards.map(toCardString)
    };
}

export function evaluateHands(): { result: IResult } {
    const deck = shuffleDeck(createDeck());
    let hand: TCard[] = [];
    const randomCards: string[] = [];

    while (hand.length < 6) {
        const card = deck[Math.floor(Math.random() * 52)]
        const concat = `${card.num}+${card.suit}`;
        if (!randomCards.includes(concat)) {
            randomCards.push(concat);
            hand.push(card);
        }
    }

    const [playerAHand, playerBHand] = [hand.slice(0, 3), hand.slice(3, 6)]

    const playerAHandType: THandTypeResult = getHandTypes(playerAHand);
    const playerBHandType: THandTypeResult = getHandTypes(playerBHand);
    const bonusHand: THandTypeResult = SixCardHandType(hand);
    let result: IResult = {
        playerAHand,
        playerBHand,
        playerAHandType,
        playerBHandType,
        bonusHand,
        winner: 'no_winner',
    }

    const handRanks = {
        'no_hand_match': 0,
        'high_card': 1,
        'pair': 2,
        'flush': 3,
        'straight': 4,
        'straight_flush': 5,
        'three_of_a_kind': 6,
        'three_of_kind_ace': 7,
        'four_of_a_kind': 8,
        'full_house': 9,
        'royal_flush': 10
    }

    result.playerAHandType = playerAHandType;
    result.playerBHandType = playerBHandType;
    result.bonusHand = bonusHand;

    const rankA = handRanks[playerAHandType.handType];
    const rankB = handRanks[playerBHandType.handType];

    if (rankA > rankB) result.winner = 'player_A'
    else if (rankA < rankB) result.winner = 'player_B'
    else if (rankA == rankB) {
        const playerASuits = playerAHand.map(player => player.suit);
        const playerBSuits = playerBHand.map(player => player.suit);
        const sortedplayerANums = playerAHand.map(card => card.num).sort((a, b) => b - a);
        const sortedplayerBNums = playerBHand.map(card => card.num).sort((a, b) => b - a);
        for (let i = 0; i < 3; i++) {
            if (sortedplayerANums[i] > sortedplayerBNums[i]) result.winner = 'player_A';
            else if (sortedplayerBNums[i] > sortedplayerANums[i]) result.winner = 'player_B';
            else if (sortedplayerANums[i] == sortedplayerBNums[i]) {
                const suitPreference: Record<string, number> = {
                    'S': 4,
                    'H': 3,
                    'D': 2,
                    'C': 1
                }
                if (suitPreference[playerASuits[i]] > suitPreference[playerBSuits[i]]) result.winner = 'player_A'
                else if (suitPreference[playerASuits[i]] < suitPreference[playerBSuits[i]]) result.winner = 'player_B'
            }
        }
    }
    return {
        result
    }
};

// 6 HAND BONUS
function SixCardHandType(hand: TCard[]): THandTypeResult {
    const suits = ['H', 'S', 'C', 'D'];
    const cardValue = (num: number) => num === 1 ? 14 : num;

    const sortedHand = [...hand].sort((a, b) => cardValue(a.num) - cardValue(b.num));
    const royalFlushSuit = suits.find(suit =>
        [10, 11, 12, 13, 14].every(num =>
            hand.some(card => card.suit === suit && cardValue(card.num) === num)
        )
    );

    if (royalFlushSuit) {
        const winning = sortedHand
            .filter(c => c.suit === royalFlushSuit && cardValue(c.num) >= 10);
        return {
            handType: 'royal_flush',
            winningCards: winning.map(toCardString)
        };
    }

    const flushSuit = suits.find(suit =>
        hand.filter(card => card.suit === suit).length >= 5
    );

    const uniqueSorted = [...new Map(sortedHand.map(c => [cardValue(c.num), c]))]
        .map(([_, card]) => card);
    let straightCards: TCard[] = [];
    let straightCount = 1;
    for (let i = 0; i < uniqueSorted.length - 1; i++) {
        if (cardValue(uniqueSorted[i + 1].num) === cardValue(uniqueSorted[i].num) + 1) {
            straightCount++;
            straightCards.push(uniqueSorted[i]);
            if (straightCount >= 5) {
                straightCards.push(uniqueSorted[i + 1]);
                break;
            }
        } else {
            straightCount = 1;
            straightCards = [];
        }
    }

    if (!straightCards.length && uniqueSorted.some(c => c.num === 1)) {
        const lowStraightNums = [1, 2, 3, 4, 5];
        if (lowStraightNums.every(n => uniqueSorted.some(c => c.num === n))) {
            straightCards = lowStraightNums.map(n => uniqueSorted.find(c => c.num === n)!);
        }
    }
    const straight = straightCards.length >= 5;

    if (straight && flushSuit) {
        const sfCards = straightCards.filter(c => c.suit === flushSuit);
        if (sfCards.length >= 5) {
            const winning = sfCards.slice(0, 5);
            return {
                handType: 'straight_flush',
                winningCards: winning.map(toCardString)
            };
        }
    }

    const cardNumberFrequency: Record<number, number> = {};
    hand.forEach(card => {
        cardNumberFrequency[card.num] = (cardNumberFrequency[card.num] || 0) + 1;
    });

    const counts = Object.entries(cardNumberFrequency);
    const fourKindNum = Number(counts.find(([_, c]) => c === 4)?.[0]);
    const threeKindNum = Number(counts.find(([_, c]) => c === 3)?.[0]);
    const pairNums = counts.filter(([_, c]) => c === 2).map(([n]) => Number(n));
    const fullHouse = threeKindNum && pairNums.length > 0;

    if (fourKindNum) {
        const winning = hand.filter(c => c.num === fourKindNum);
        return {
            handType: 'four_of_a_kind',
            winningCards: winning.map(toCardString)
        };
    }
    if (fullHouse) {
        const winning = [
            ...hand.filter(c => c.num === threeKindNum),
            ...hand.filter(c => c.num === pairNums[0])
        ];
        return {
            handType: 'full_house',
            winningCards: winning.map(toCardString)
        };
    }
    if (flushSuit) {
        const winning = sortedHand.filter(c => c.suit === flushSuit).slice(-5);
        return {
            handType: 'flush',
            winningCards: winning.map(toCardString)
        };
    }
    if (straight) {
        const winning = straightCards.slice(0, 5);
        return {
            handType: 'straight',
            winningCards: winning.map(toCardString)
        };
    }
    if (threeKindNum) {
        const winning = hand.filter(c => c.num === threeKindNum);
        return {
            handType: 'three_of_a_kind',
            winningCards: winning.map(toCardString)
        };
    }

    return {
        handType: 'no_hand_match',
        winningCards: []
    };
}
