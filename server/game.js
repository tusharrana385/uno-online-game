// Represents a single UNO card
class Card {
  constructor(color, value, type) {
    this.color = color; // red, blue, green, yellow, wild
    this.value = value; // 0-9, skip, reverse, draw2, draw4
    this.type = type;   // number, action, wild
  }
}

module.exports = Card;

function createDeck() {
  const colors = ["red", "blue", "green", "yellow"];
  const deck = [];

  // Number cards
  for (let color of colors) {
    for (let i = 0; i <= 9; i++) {
      deck.push({ color, value: i, type: "number" });
      if (i !== 0) {
        deck.push({ color, value: i, type: "number" });
      }
    }

    // Action cards
    ["skip", "reverse", "draw2"].forEach(action => {
      deck.push({ color, value: action, type: "action" });
      deck.push({ color, value: action, type: "action" });
    });
  }

  // Wild cards
  for (let i = 0; i < 4; i++) {
    deck.push({ color: "wild", value: "wild", type: "wild" });
    deck.push({ color: "wild", value: "draw4", type: "wild" });
  }

  return deck;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function dealCards(deck, players) {
  players.forEach(player => {
    player.hand = [];
    for (let i = 0; i < 7; i++) {
      player.hand.push(deck.pop());
    }
  });
}

function isValidMove(card, topCard, currentColor) {
  return (
    card.color === currentColor ||
    card.value === topCard.value ||
    card.color === "wild"
  );
}

function applyCardEffect(card, gameState) {
  switch (card.value) {
    case "skip":
      gameState.skipNext = true;
      break;

    case "reverse":
      gameState.direction *= -1;
      break;

    case "draw2":
      gameState.drawCount = 2;
      break;

    case "draw4":
      gameState.drawCount = 4;
      break;
  }
}

function calculateScore(players) {
  let score = 0;

  players.forEach(player => {
    player.hand.forEach(card => {
      if (card.type === "number") score += card.value;
      else if (card.type === "action") score += 20;
      else score += 50;
    });
  });

  return score;
}
