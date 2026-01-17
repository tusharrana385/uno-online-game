const colors = ["red", "blue", "green", "yellow"];

function createDeck() {
  let deck = [];
  colors.forEach(color => {
    for (let i = 0; i <= 9; i++) {
      deck.push({ color, value: i });
    }
  });
  return deck.sort(() => Math.random() - 0.5);
}

function createGame(players) {
  const deck = createDeck();
  let hands = {};

  players.forEach(p => {
    hands[p] = [];
    for (let i = 0; i < 5; i++) {
      hands[p].push(deck.pop());
    }
  });

  return {
    deck,
    hands,
    topCard: deck.pop(),
    turn: 0,
    players
  };
}

function canPlay(card, topCard) {
  return card.color === topCard.color || card.value === topCard.value;
}

module.exports = { createGame, canPlay };
