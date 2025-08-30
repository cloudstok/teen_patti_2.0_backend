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
    const [c1, c2, c3] = sortedHand;

    const flush = c1.suit === c2.suit && c2.suit === c3.suit;
    const straight = (c2.num === c1.num + 1 && c3.num === c2.num + 1) || (c1.num === 2 && c2.num === 3 && c3.num === 14);
    const threeOfKindAce = c1.num === 14 && c2.num === 14 && c3.num === 14;
    const threeOfKind = c1.num === c2.num && c2.num === c3.num;
    const pairValue = c1.num === c2.num ? c1.num : c2.num === c3.num ? c2.num : c1.num;
    const pair = c1.num === c2.num || c2.num === c3.num || c1.num === c3.num;
    const straightFlush = flush && straight;

    let handType: THandType = 'high_card';
    let winningCards: TCard[] = [sortedHand[sortedHand.length - 1]]; // last card as default high card

    if (threeOfKindAce) winningCards = sortedHand, handType = 'three_of_kind_ace';
    else if (threeOfKind) winningCards = sortedHand, handType = 'three_of_a_kind';
    else if (straightFlush) winningCards = sortedHand, handType = 'straight_flush';
    else if (straight) winningCards = sortedHand, handType = 'straight';
    else if (flush) winningCards = sortedHand, handType = 'flush';
    else if (pair) winningCards = sortedHand.filter(card => card.num === pairValue), handType = 'pair';

    const winSet = winningCards.map(toCardString);

    return {
        handType,
        winningCards: [...winSet],
        remainingCards: hand.map(toCardString).filter(c => !winSet.includes(c))
    };
}

export function evaluateHands(): { finalResult: IResult } {
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
    let finalResult: IResult = {
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

    const rankA = handRanks[playerAHandType.handType];
    const rankB = handRanks[playerBHandType.handType];
    finalResult.winner = resultCalculation(rankA, rankB, playerAHand, playerBHand)

    return {
        finalResult
    }
};

function resultCalculation(rankA: number, rankB: number, playerAHand: TCard[], playerBHand: TCard[]): string {
    let result: string = 'no_winner'
    if (rankA > rankB) result = 'player_A'
    else if (rankA < rankB) result = 'player_B'
    else if (rankA == rankB) {
        const sortedANums = [...playerAHand].sort((a, b) => b.num - a.num);
        const sortedBNums = [...playerBHand].sort((a, b) => b.num - a.num);

        for (let i = 0; i < sortedANums.length; i++) {
            if (sortedANums[i].num > sortedBNums[i].num) {
                result = "player_A";
                break;
            } else if (sortedBNums[i].num > sortedANums[i].num) {
                result = "player_B";
                break;
            }
        }

        if (result === "no_winner") {
            const suitPreference: Record<string, number> = {
                "S": 4,
                "H": 3,
                "D": 2,
                "C": 1
            };

            for (let i = (sortedANums.length - 1); i >= 0; i--) {
                const suitA = playerAHand[i].suit;
                const suitB = playerBHand[i].suit;
                if (suitPreference[suitA] > suitPreference[suitB]) {
                    result = "player_A";
                    break;
                } else if (suitPreference[suitA] < suitPreference[suitB]) {
                    result = "player_B";
                    break;
                }
            }
        }
    }

    return result
}

const filterByNum = (hand: TCard[], num: number) => hand.filter(c => c.num === num);
const filterBySuit = (hand: TCard[], suit: string) => hand.filter(c => c.suit === suit);

// 6 HAND BONUS
function SixCardHandType(hand: TCard[]): THandTypeResult {
    const suits = ['H', 'S', 'C', 'D'];

    const sortedHand = [...hand].sort((a, b) => (a.num) - (b.num));
    for (const suit of suits) {
        const royalCards = sortedHand.filter(c => c.suit === suit && c.num >= 10);
        if (royalCards.length === 5) {
            return {
                handType: 'royal_flush',
                winningCards: royalCards.map(toCardString)
            };
        }
    }

    const flushSuit = suits.find(suit =>
        hand.filter(card => card.suit === suit).length >= 5
    );

    let straightCards: TCard[] = [];
    for (let i = 0; i < sortedHand.length; i++) {
        if (
            straightCards.length === 0 ||
            sortedHand[i].num === straightCards[straightCards.length - 1].num + 1
        ) {
            straightCards.push(sortedHand[i]);
        } else if (sortedHand[i].num !== straightCards[straightCards.length - 1].num) {
            straightCards = [sortedHand[i]];
        }
    }
    if (straightCards.length < 5) {
        straightCards = [];
    }

    if (!straightCards.length && sortedHand.some(c => c.num === 14)) {
        const lowStraightNums = [2, 3, 4, 5, 14];
        const lowStraight = [];
        for (let num of lowStraightNums) {
            const card = sortedHand.find(c => c.num === num);
            if (card) lowStraight.push(card);
        }
        if (lowStraight.length === 5) {
            straightCards = lowStraight;
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

    let fourKindNum: number | null = null;
    let threeKindNum: number | null = null;
    let pairNum: number[] = []

    for (const [numStr, count] of Object.entries(cardNumberFrequency)) {
        const num = Number(numStr);
        if (count === 4) {
            fourKindNum = num;
        } else if (count === 3) {
            threeKindNum = num;
        } else if (count === 2) {
            pairNum.push(num);
        }
    }


    if (fourKindNum) {
        return {
            handType: 'four_of_a_kind',
            winningCards: filterByNum(hand, fourKindNum).map(toCardString)
        };
    }
    if (threeKindNum !== null && pairNum.length > 0) {
        return {
            handType: 'full_house',
            winningCards: [
                ...filterByNum(hand, threeKindNum),
                ...filterByNum(hand, pairNum[0])
            ].map(toCardString)
        };
    }
    if (flushSuit) {
        return {
            handType: 'flush',
            winningCards:  filterBySuit(sortedHand, flushSuit).slice(-5).map(toCardString)
        };
    }
    if (straight) {
        return {
            handType: 'straight',
            winningCards: straightCards.slice(0, 5).map(toCardString)
        };
    }
    if (threeKindNum) {
        return {
            handType: 'three_of_a_kind',
            winningCards:  filterByNum(hand, threeKindNum).map(toCardString)
        };
    }

    return {
        handType: 'no_hand_match',
        winningCards: []
    };
}
