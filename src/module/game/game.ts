import { IResult, TCard, THandType } from "../../interfaces";


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

function getHandTypes(hand: TCard[]): THandType {
    const nums = hand.map(card => card.num).sort((a, b) => a - b);
    const suitsDrawn = hand.map(card => card.suit);

    const [num1, num2, num3] = nums;
    const flush = suitsDrawn[0] === suitsDrawn[1] && suitsDrawn[1] === suitsDrawn[2]
    const straight = num2 === num1 + 1 && num3 === num2 + 1;
    const threeOfKindAce = num1 === 1 && num2 === 1 && num3 === 1;
    const threeOfKind = num1 === num2 && num2 === num3;
    const pair = num1 === num2 || num2 === num3 || num1 === num3;
    const straightFlush = flush && straight;

    let handType: THandType = 'high_card';
    if (threeOfKindAce) handType = 'three_of_kind_ace';
    if (threeOfKind) handType = 'three_of_a_kind';
    else if (straightFlush) handType = 'straight_flush';
    else if (straight) handType = 'straight';
    else if (flush) handType = 'flush';
    else if (pair) handType = 'pair';
    return handType;
};

export function evaluateHands():{result:IResult} {
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

    const playerAHandType: THandType = getHandTypes(playerAHand);
    const playerBHandType: THandType = getHandTypes(playerBHand);
    const bonusHand: THandType = SixCardHandType(hand);

     let result:IResult = {
        playerAHand,
        playerBHand,
        playerAHandType,
        playerBHandType,
        bonusHand,
        winner: 0,   // 1 => Player A or 2 => Player B , 0 => No winner(default)
        bonusWinner: 0
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

    const rankA = handRanks[playerAHandType];
    const rankB = handRanks[playerBHandType];
    const bonusRank = handRanks[bonusHand];

    if (bonusRank) result.bonusWinner = bonusRank
    if (rankA > rankB) result.winner = 1
    else if (rankA < rankB) result.winner = 2
    else if (rankA == rankB) {
        const playerASuits = playerAHand.map(player => player.suit);
        const playerBSuits = playerBHand.map(player => player.suit);
        const sortedplayerANums = playerAHand.map(card => card.num).sort((a, b) => b - a);
        const sortedplayerBNums = playerBHand.map(card => card.num).sort((a, b) => b - a);
        for (let i = 0; i < 3; i++) {
            if (sortedplayerANums[i] > sortedplayerBNums[i]) result.winner = 1;
            else if (sortedplayerBNums[i] > sortedplayerANums[i]) result.winner = 2;
            else if (sortedplayerANums[i] == sortedplayerBNums[i]) {
                const suitPreference: Record<string, number> = {
                    'S': 4,
                    'H': 3,
                    'D': 2,
                    'C': 1
                }
                if (suitPreference[playerASuits[i]] > suitPreference[playerBSuits[i]]) result.winner = 1
                else if (suitPreference[playerASuits[i]] < suitPreference[playerBSuits[i]]) result.winner = 2
            }
        }
    }
    return {
        result
    }
};

// 6 HAND BONUS
function SixCardHandType(hand: TCard[]) {
    const nums = hand.map(card => card.num).sort((a, b) => a - b);
    const suits = ['H', 'S', 'C', 'D'];

    const royalFlush = suits.some(suit =>
        [10, 11, 12, 13, 14].every(num =>
            hand.some(card => card.suit === suit && card.num === num)
        )
    );

    const flush = suits.some(suit =>
        hand.filter(card => card.suit === suit).length >= 5
    );

    const uniqueNums = [...new Set(nums)];
    let straightCount = 1;
    let straight = false;

    for (let i = 0; i < uniqueNums.length - 1; i++) {
        if (uniqueNums[i + 1] === uniqueNums[i] + 1) {
            straightCount++;
            if (straightCount >= 5) {
                straight = true;
                break;
            }
        }
    }

    const cardNumberFrequency: Record<number, number> = {};
    hand.forEach(card => {
        cardNumberFrequency[card.num] = (cardNumberFrequency[card.num] || 0) + 1;
    });

    const counts = Object.values(cardNumberFrequency);
    const fourOfKind = counts.includes(4);
    const threeOfKind = counts.includes(3);
    const pair = counts.includes(2);
    const fullHouse = threeOfKind && pair;

    let handType: THandType = 'no_hand_match';
    if (royalFlush) handType = 'royal_flush';
    else if (straight && flush) handType = 'straight_flush';
    else if (fourOfKind) handType = 'four_of_a_kind';
    else if (fullHouse) handType = 'full_house';
    else if (flush) handType = 'flush';
    else if (straight) handType = 'straight';
    else if (threeOfKind) handType = 'three_of_a_kind';
    return handType;

};