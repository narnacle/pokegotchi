// Game state
const gameState = {
    pokemon: null,
    nickname: null,
    hunger: 100,
    happiness: 100,
    energy: 100,
    isSleeping: false,
    sleepInterval: null,
    decayInterval: null,
    pokemonId: null,
    notificationPermission: false,
    criticalThreshold: 30 // Threshold for critical status (Hungry/Bored/Tired)
};

// DOM elements
const elements = {
    loading: document.getElementById('loading'),
    pokemonImage: document.getElementById('pokemon-image'),
    pokemonName: document.getElementById('pokemon-name'),
    displayName: document.getElementById('display-name'),
    nicknameInput: document.getElementById('nickname-input'),
    hungerValue: document.getElementById('hunger-value'),
    happinessValue: document.getElementById('happiness-value'),
    energyValue: document.getElementById('energy-value'),
    hungerBar: document.getElementById('hunger-bar'),
    happinessBar: document.getElementById('happiness-bar'),
    energyBar: document.getElementById('energy-bar'),
    message: document.getElementById('message'),
    feedBtn: document.getElementById('feed-btn'),
    playBtn: document.getElementById('play-btn'),
    sleepBtn: document.getElementById('sleep-btn'),
    newPokemonBtn: document.getElementById('new-pokemon-btn'),
    status: document.getElementById('status'),
    gameOverOverlay: document.getElementById('game-over-overlay')
};

// Initialize the game
function initGame() {
    // Request notification permission
    requestNotificationPermission();

    // Set up event listeners
    document.querySelector('.edit-icon').addEventListener('click', showNicknameInput);
    elements.nicknameInput.addEventListener('blur', saveNickname);
    elements.nicknameInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') saveNickname();
    });

    elements.feedBtn.addEventListener('click', feedPokemon);
    elements.playBtn.addEventListener('click', playWithPokemon);
    elements.sleepBtn.addEventListener('click', toggleSleep);
    elements.newPokemonBtn.addEventListener('click', getRandomPokemon);

    // Try to load saved game
    if (!loadGameState()) {
        // Start with a random Pokémon if no saved game
        getRandomPokemon();
    } else {
        // Display loaded Pokémon
        displayPokemon();
        updateStatsDisplay();
        elements.loading.style.display = 'none';
        elements.pokemonImage.style.display = 'block';
        elements.pokemonName.style.display = 'block';

        if (gameState.isSleeping) {
            elements.pokemonImage.style.opacity = "0.7";
            elements.status.textContent = "Sleeping";
            elements.status.className = "status sleeping";
        }

        showMessage(`Welcome back! Your ${gameState.nickname || capitalizeFirstLetter(gameState.pokemon.name)} missed you!`);
    }
}

// Request notification permission
function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            gameState.notificationPermission = permission === 'granted';
        });
    }
}

// Send browser notification
function sendNotification(title, message) {
    if (gameState.notificationPermission && !document.hasFocus()) {
        new Notification(title, { body: message });
    }
}

// Save game state to localStorage
function saveGameState() {
    const saveData = {
        pokemonId: gameState.pokemonId,
        pokemonData: gameState.pokemon,
        nickname: gameState.nickname,
        hunger: gameState.hunger,
        happiness: gameState.happiness,
        energy: gameState.energy,
        isSleeping: gameState.isSleeping,
        timestamp: Date.now()
    };
    localStorage.setItem('pokemonTamagotchi', JSON.stringify(saveData));
}

// Load game state from localStorage
function loadGameState() {
    const saved = localStorage.getItem('pokemonTamagotchi');
    if (!saved) return false;

    const saveData = JSON.parse(saved);

    // Don't load if saved data is older than 24 hours
    if (Date.now() - saveData.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('pokemonTamagotchi');
        return false;
    }

    gameState.pokemonId = saveData.pokemonId;
    gameState.pokemon = saveData.pokemonData;
    gameState.nickname = saveData.nickname;
    gameState.hunger = saveData.hunger;
    gameState.happiness = saveData.happiness;
    gameState.energy = saveData.energy;
    gameState.isSleeping = saveData.isSleeping;

    return true;
}

// Reset the game state
function resetGame() {
    // Reset all game state variables
    gameState.hunger = 100;
    gameState.happiness = 100;
    gameState.energy = 100;
    gameState.isSleeping = false;
    gameState.nickname = null;

    // Clear any existing intervals
    if (gameState.decayInterval) clearInterval(gameState.decayInterval);
    if (gameState.sleepInterval) clearInterval(gameState.sleepInterval);

    // Reset UI elements
    elements.feedBtn.disabled = false;
    elements.playBtn.disabled = false;
    elements.sleepBtn.disabled = false;
    elements.newPokemonBtn.style.display = 'none';
    elements.gameOverOverlay.style.display = 'none';

    elements.pokemonImage.style.opacity = "1";
    elements.pokemonImage.style.filter = "none";
    updateStatus();

    // Restart stat decay
    startStatDecay();
}

// Fetch a random Pokémon from PokeAPI
function getRandomPokemon() {
    resetGame(); // Reset the game state first

    // Show loading animation
    elements.loading.style.display = 'block';
    elements.pokemonImage.style.display = 'none';
    elements.pokemonName.style.display = 'none';

    // Random Pokémon ID between 1 and 898 (generations 1-8)
    const randomId = Math.floor(Math.random() * 898) + 1;
    gameState.pokemonId = randomId;

    fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`)
        .then(response => response.json())
        .then(data => {
            gameState.pokemon = data;
            gameState.nickname = null; // Reset nickname for new Pokémon
            displayPokemon();

            // Reset stats (though resetGame already did this)
            gameState.hunger = 100;
            gameState.happiness = 100;
            gameState.energy = 100;
            updateStatsDisplay();

            // Hide loading animation
            elements.loading.style.display = 'none';
            elements.pokemonImage.style.display = 'block';
            elements.pokemonName.style.display = 'block';

            showMessage(`A wild ${capitalizeFirstLetter(data.name)} appeared!`);
            saveGameState();
        })
        .catch(error => {
            console.error('Error fetching Pokémon:', error);
            showMessage('Failed to fetch Pokémon. Please try again.');
            elements.loading.style.display = 'none';
        });
}

// Display the Pokémon
function displayPokemon() {
    elements.pokemonImage.src = gameState.pokemon.sprites.other['official-artwork'].front_default ||
        gameState.pokemon.sprites.front_default;
    updateDisplayName();
}

// Update the displayed name (nickname or original)
function updateDisplayName() {
    elements.displayName.textContent = gameState.nickname || capitalizeFirstLetter(gameState.pokemon.name);
}

// Show nickname input field
function showNicknameInput() {
    elements.nicknameInput.style.display = 'block';
    elements.nicknameInput.value = gameState.nickname || capitalizeFirstLetter(gameState.pokemon.name);
    elements.displayName.style.display = 'none';
    elements.nicknameInput.focus();
}

// Save nickname from input
function saveNickname() {
    elements.nicknameInput.style.display = 'none';
    elements.displayName.style.display = 'inline';

    gameState.nickname = elements.nicknameInput.value.trim() || null;
    updateDisplayName();
    saveGameState();
}

// Update the stats display
function updateStatsDisplay() {
    // Update values
    elements.hungerValue.textContent = `${gameState.hunger}%`;
    elements.happinessValue.textContent = `${gameState.happiness}%`;
    elements.energyValue.textContent = `${gameState.energy}%`;

    // Update progress bars
    elements.hungerBar.style.width = `${gameState.hunger}%`;
    elements.happinessBar.style.width = `${gameState.happiness}%`;
    elements.energyBar.style.width = `${gameState.energy}%`;

    // Change colors based on low stats
    if (gameState.hunger < 30) {
        elements.hungerBar.style.backgroundColor = '#ff4757';
    } else {
        elements.hungerBar.style.backgroundColor = '#ff9f43';
    }

    if (gameState.happiness < 30) {
        elements.happinessBar.style.backgroundColor = '#ff4757';
    } else {
        elements.happinessBar.style.backgroundColor = '#ff6b6b';
    }

    if (gameState.energy < 30) {
        elements.energyBar.style.backgroundColor = '#ff4757';
    } else {
        elements.energyBar.style.backgroundColor = '#48dbfb';
    }

    // Update status
    updateStatus();

    // Check for game over conditions
    checkGameOver();

    // Check for critical stats and send notifications
    checkCriticalStats();

    // Save game state
    saveGameState();
}

// Update the status display
function updateStatus() {
    if (gameState.isSleeping) {
        elements.status.textContent = "Sleeping";
        elements.status.className = "status sleeping";
        return;
    }

    // Check for critical stats
    if (gameState.hunger <= gameState.criticalThreshold) {
        elements.status.textContent = "Hungry";
        elements.status.className = "status hungry";
    } else if (gameState.happiness <= gameState.criticalThreshold) {
        elements.status.textContent = "Bored";
        elements.status.className = "status bored";
    } else if (gameState.energy <= gameState.criticalThreshold) {
        elements.status.textContent = "Tired";
        elements.status.className = "status tired";
    } else {
        elements.status.textContent = "Healthy";
        elements.status.className = "status healthy";
    }
}

// Check for critical stats and send notifications
function checkCriticalStats() {
    if (gameState.hunger <= gameState.criticalThreshold) {
        sendNotification('Pokémon Tamagotchi', `${gameState.nickname || capitalizeFirstLetter(gameState.pokemon.name)} is hungry!`);
    }
    if (gameState.happiness <= gameState.criticalThreshold) {
        sendNotification('Pokémon Tamagotchi', `${gameState.nickname || capitalizeFirstLetter(gameState.pokemon.name)} is bored!`);
    }
    if (gameState.energy <= gameState.criticalThreshold) {
        sendNotification('Pokémon Tamagotchi', `${gameState.nickname || capitalizeFirstLetter(gameState.pokemon.name)} is tired!`);
    }
}

// Start stat decay over time
function startStatDecay() {
    if (gameState.decayInterval) {
        clearInterval(gameState.decayInterval);
    }

    gameState.decayInterval = setInterval(() => {
        if (!gameState.isSleeping) {
            // Normal decay rates - happiness now decays faster
            gameState.hunger = Math.max(0, gameState.hunger - 2);
            gameState.happiness = Math.max(0, gameState.happiness - 2);
            gameState.energy = Math.max(0, gameState.energy - 1);
        } else {
            // Different decay rates when sleeping
            gameState.hunger = Math.max(0, gameState.hunger - 0.5);
            gameState.happiness = Math.max(0, gameState.happiness - 0.5);
            gameState.energy = Math.min(100, gameState.energy + 5);
        }

        updateStatsDisplay();
    }, 3000); // Update every 3 seconds
}

// Feed the Pokémon - ONLY AFFECTS HUNGER
function feedPokemon() {
    if (gameState.isSleeping) {
        showMessage(`${gameState.nickname || capitalizeFirstLetter(gameState.pokemon.name)} is sleeping! Don't disturb it.`);
        return;
    }

    if (gameState.hunger >= 100) {
        showMessage(`${gameState.nickname || capitalizeFirstLetter(gameState.pokemon.name)} is not hungry right now.`);
        return;
    }

    // ONLY increase hunger now (no happiness change)
    gameState.hunger = Math.min(100, gameState.hunger + 20);
    gameState.energy = Math.max(0, gameState.energy - 5);

    updateStatsDisplay();
    showMessage(`You fed ${gameState.nickname || capitalizeFirstLetter(gameState.pokemon.name)}. It's less hungry now!`);

    animatePokemon();
    saveGameState();
}

// Play with the Pokémon - STRONGER EFFECT
function playWithPokemon() {
    if (gameState.isSleeping) {
        showMessage(`${gameState.nickname || capitalizeFirstLetter(gameState.pokemon.name)} is sleeping! Let it rest.`);
        return;
    }

    if (gameState.energy < 20) {
        showMessage(`${gameState.nickname || capitalizeFirstLetter(gameState.pokemon.name)} is too tired to play.`);
        return;
    }

    // Increased happiness gain
    gameState.happiness = Math.min(100, gameState.happiness + 25);
    gameState.energy = Math.max(0, gameState.energy - 15);
    gameState.hunger = Math.max(0, gameState.hunger - 5);

    updateStatsDisplay();
    showMessage(`You played with ${gameState.nickname || capitalizeFirstLetter(gameState.pokemon.name)}. It had lots of fun!`);

    animatePokemon(1.5);
    saveGameState();
}

// Toggle sleep state
function toggleSleep() {
    if (gameState.isSleeping) {
        // Wake up
        gameState.isSleeping = false;
        clearInterval(gameState.sleepInterval);
        elements.pokemonImage.style.opacity = "1";
        showMessage(`${gameState.nickname || capitalizeFirstLetter(gameState.pokemon.name)} woke up!`);
    } else {
        // Go to sleep
        gameState.isSleeping = true;
        elements.pokemonImage.style.opacity = "0.7";
        showMessage(`${gameState.nickname || capitalizeFirstLetter(gameState.pokemon.name)} went to sleep. Zzz...`);

        // Make Pokémon wake up automatically after some time
        gameState.sleepInterval = setTimeout(() => {
            toggleSleep();
        }, 20000); // 20 seconds
    }
    updateStatus();
    saveGameState();
}

// Check for game over conditions
function checkGameOver() {
    if (gameState.hunger <= 0 || gameState.happiness <= 0 || gameState.energy <= 0) {
        // Game over
        clearInterval(gameState.decayInterval);
        if (gameState.sleepInterval) clearInterval(gameState.sleepInterval);

        let reason = "";
        if (gameState.hunger <= 0) reason = "starved";
        else if (gameState.happiness <= 0) reason = "got too sad";
        else if (gameState.energy <= 0) reason = "got too exhausted";

        showMessage(`Oh no! ${gameState.nickname || capitalizeFirstLetter(gameState.pokemon.name)} ${reason} and ran away!`);

        // Disable buttons
        elements.feedBtn.disabled = true;
        elements.playBtn.disabled = true;
        elements.sleepBtn.disabled = true;

        // Show game over overlay and new Pokémon button
        elements.gameOverOverlay.style.display = 'block';
        elements.newPokemonBtn.style.display = 'block';

        // Fade out the Pokémon
        elements.pokemonImage.style.opacity = "0.5";
        elements.pokemonImage.style.filter = "grayscale(100%)";

        // Update status
        elements.status.textContent = "Ran Away";
        elements.status.className = "status";

        // Clear saved game
        localStorage.removeItem('pokemonTamagotchi');
    }
}

// Show a message to the player
function showMessage(text) {
    elements.message.textContent = text;

    // Clear any previous animation
    elements.message.style.animation = 'none';
    void elements.message.offsetWidth; // Trigger reflow
    elements.message.style.animation = 'fadeIn 0.5s';
}

// Animate the Pokémon
function animatePokemon(intensity = 1) {
    elements.pokemonImage.style.transform = `scale(${1 + 0.1 * intensity})`;
    setTimeout(() => {
        elements.pokemonImage.style.transform = 'scale(1)';
    }, 300);
}

// Helper function to capitalize the first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', initGame);