// Factual record extraction from https://gbc.zorbus.net/mm/01_por.html
// Gold Box Companion author: decoded original DOS game data. Retrieved 2026-10-14.
// Base template statistics; variants are retained. No source artwork included.
export const POOL_MONSTER_SOURCE = Object.freeze({ url: "https://gbc.zorbus.net/mm/01_por.html", retrieved: "2026-10-14", records: 169, platform: "DOS" });
export const POOL_MONSTERS = [
  {
    "id": "por_105",
    "name": "1ST LVL CLERIC",
    "sourceRecord": 105,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 14,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 10,
    "hp": 8,
    "thac0": 20,
    "movement": 12,
    "magicRes": 0,
    "xp": 18,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4"
      }
    ],
    "saves": {
      "death": 10,
      "petrification": 13,
      "wand": 14,
      "breath": 16,
      "spell": 15
    },
    "classLevels": [
      "Cleric 1"
    ],
    "items": [
      "Chain Mail",
      "Mace"
    ],
    "flags": [],
    "effects": [],
    "spells": [
      "c1: Bless",
      "c1: Detect magic",
      "m1: Reduce"
    ],
    "areas": [
      "Valjevo Castle SW"
    ]
  },
  {
    "id": "por_047",
    "name": "1ST LVL THIEF",
    "sourceRecord": 47,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 18,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 10,
    "hp": 4,
    "thac0": 20,
    "movement": 12,
    "magicRes": 0,
    "xp": 14,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 12,
      "wand": 14,
      "breath": 16,
      "spell": 15
    },
    "classLevels": [
      "Thief 1"
    ],
    "items": [
      "Leather Armor",
      "Long Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Kovel Mansion"
    ]
  },
  {
    "id": "por_093",
    "name": "1ST LVL THIEF",
    "sourceRecord": 93,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 18,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 10,
    "hp": 4,
    "thac0": 20,
    "movement": 12,
    "magicRes": 0,
    "xp": 14,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 12,
      "wand": 14,
      "breath": 16,
      "spell": 15
    },
    "classLevels": [
      "Thief 1"
    ],
    "items": [
      "Leather Armor",
      "Long Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Valjevo Castle, Inner Tower"
    ]
  },
  {
    "id": "por_111",
    "name": "1ST LVL THIEF",
    "sourceRecord": 111,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 18,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 10,
    "hp": 4,
    "thac0": 20,
    "movement": 12,
    "magicRes": 0,
    "xp": 14,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 12,
      "wand": 14,
      "breath": 16,
      "spell": 15
    },
    "classLevels": [
      "Thief 1"
    ],
    "items": [
      "Leather Armor",
      "Long Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_148",
    "name": "2ND LVL CLERIC",
    "sourceRecord": 148,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 14,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 10,
    "hp": 8,
    "thac0": 20,
    "movement": 12,
    "magicRes": 0,
    "xp": 36,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4"
      }
    ],
    "saves": {
      "death": 10,
      "petrification": 13,
      "wand": 14,
      "breath": 16,
      "spell": 15
    },
    "classLevels": [
      "Cleric 2"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_125",
    "name": "3RD LVL FIGHTER",
    "sourceRecord": 125,
    "attributes": {
      "strength": 16,
      "intelligence": 14,
      "wisdom": 14,
      "dexterity": 14,
      "constitution": 14,
      "charisma": 10
    },
    "ac": 8,
    "hp": 18,
    "thac0": 18,
    "movement": 12,
    "magicRes": 0,
    "xp": 89,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 14,
      "wand": 15,
      "breath": 16,
      "spell": 16
    },
    "classLevels": [
      "Fighter 3"
    ],
    "items": [
      "15 x Quarrel",
      "Heavy Crossbow",
      "Long Sword",
      "Plate Armor"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Buccaneers Base"
    ]
  },
  {
    "id": "por_012",
    "name": "4TH LVL FIGHTER",
    "sourceRecord": 12,
    "attributes": {
      "strength": 17,
      "intelligence": 14,
      "wisdom": 14,
      "dexterity": 14,
      "constitution": 17,
      "charisma": 10
    },
    "ac": 8,
    "hp": 30,
    "thac0": 18,
    "movement": 12,
    "magicRes": 0,
    "xp": 180,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 14,
      "wand": 15,
      "breath": 16,
      "spell": 16
    },
    "classLevels": [
      "Fighter 4"
    ],
    "items": [
      "Chain Mail +1",
      "Long Sword +1",
      "Shield"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Podol Plaza"
    ]
  },
  {
    "id": "por_046",
    "name": "4TH LVL FIGHTER",
    "sourceRecord": 46,
    "attributes": {
      "strength": 17,
      "intelligence": 14,
      "wisdom": 14,
      "dexterity": 14,
      "constitution": 17,
      "charisma": 10
    },
    "ac": 8,
    "hp": 30,
    "thac0": 18,
    "movement": 12,
    "magicRes": 0,
    "xp": 180,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 14,
      "wand": 15,
      "breath": 16,
      "spell": 16
    },
    "classLevels": [
      "Fighter 4"
    ],
    "items": [
      "Chain Mail +1",
      "Long Sword +1",
      "Shield"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Civilized Area"
    ]
  },
  {
    "id": "por_092",
    "name": "4TH LVL FIGHTER",
    "sourceRecord": 92,
    "attributes": {
      "strength": 17,
      "intelligence": 14,
      "wisdom": 14,
      "dexterity": 14,
      "constitution": 17,
      "charisma": 10
    },
    "ac": 8,
    "hp": 30,
    "thac0": 18,
    "movement": 12,
    "magicRes": 0,
    "xp": 180,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 14,
      "wand": 15,
      "breath": 16,
      "spell": 16
    },
    "classLevels": [
      "Fighter 4"
    ],
    "items": [
      "Chain Mail +1",
      "Long Sword +1",
      "Shield"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Valjevo Castle SW"
    ]
  },
  {
    "id": "por_110",
    "name": "4TH LVL FIGHTER",
    "sourceRecord": 110,
    "attributes": {
      "strength": 17,
      "intelligence": 14,
      "wisdom": 14,
      "dexterity": 14,
      "constitution": 17,
      "charisma": 10
    },
    "ac": 8,
    "hp": 30,
    "thac0": 18,
    "movement": 12,
    "magicRes": 0,
    "xp": 180,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 14,
      "wand": 15,
      "breath": 16,
      "spell": 16
    },
    "classLevels": [
      "Fighter 4"
    ],
    "items": [
      "Chain Mail +1",
      "Long Sword +1",
      "Shield"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Buccaneers Base"
    ]
  },
  {
    "id": "por_134",
    "name": "4TH LVL FIGHTER",
    "sourceRecord": 134,
    "attributes": {
      "strength": 17,
      "intelligence": 14,
      "wisdom": 14,
      "dexterity": 14,
      "constitution": 17,
      "charisma": 10
    },
    "ac": 8,
    "hp": 30,
    "thac0": 18,
    "movement": 12,
    "magicRes": 0,
    "xp": 180,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 14,
      "wand": 15,
      "breath": 16,
      "spell": 16
    },
    "classLevels": [
      "Fighter 4"
    ],
    "items": [
      "Chain Mail +1",
      "Long Sword +1",
      "Shield"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Nomad Camp"
    ]
  },
  {
    "id": "por_126",
    "name": "5TH LVL FIGHTER",
    "sourceRecord": 126,
    "attributes": {
      "strength": 17,
      "intelligence": 14,
      "wisdom": 14,
      "dexterity": 15,
      "constitution": 14,
      "charisma": 10
    },
    "ac": 10,
    "hp": 39,
    "thac0": 16,
    "movement": 12,
    "magicRes": 0,
    "xp": 285,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 11,
      "petrification": 12,
      "wand": 13,
      "breath": 13,
      "spell": 14
    },
    "classLevels": [
      "Fighter 5"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Buccaneers Base"
    ]
  },
  {
    "id": "por_042",
    "name": "5TH LVL MU",
    "sourceRecord": 42,
    "attributes": {
      "strength": 10,
      "intelligence": 15,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 9,
    "hp": 20,
    "thac0": 20,
    "movement": 12,
    "magicRes": 0,
    "xp": 190,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4+2"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 13,
      "wand": 11,
      "breath": 15,
      "spell": 12
    },
    "classLevels": [
      "Mage 5"
    ],
    "items": [
      "Dagger"
    ],
    "flags": [],
    "effects": [],
    "spells": [
      "m1: Charm person (2)",
      "m1: Magic missile (2)",
      "m2: Mirror image",
      "m2: Stinking cloud",
      "m3: Hold person"
    ],
    "areas": [
      "Stojanow Gate"
    ]
  },
  {
    "id": "por_014",
    "name": "6TH LVL FIGHTER",
    "sourceRecord": 14,
    "attributes": {
      "strength": 17,
      "intelligence": 12,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 14
    },
    "ac": 2,
    "hp": 45,
    "thac0": 13,
    "movement": 12,
    "magicRes": 0,
    "xp": 420,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8+2"
      }
    ],
    "saves": {
      "death": 11,
      "petrification": 12,
      "wand": 13,
      "breath": 13,
      "spell": 14
    },
    "classLevels": [
      "Fighter 6"
    ],
    "items": [
      "Long Sword +1",
      "Plate Armor",
      "Shield"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_040",
    "name": "6TH LVL FIGHTER",
    "sourceRecord": 40,
    "attributes": {
      "strength": 17,
      "intelligence": 12,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 14
    },
    "ac": 2,
    "hp": 45,
    "thac0": 13,
    "movement": 12,
    "magicRes": 0,
    "xp": 420,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8+2"
      }
    ],
    "saves": {
      "death": 11,
      "petrification": 12,
      "wand": 13,
      "breath": 13,
      "spell": 14
    },
    "classLevels": [
      "Fighter 6"
    ],
    "items": [
      "Long Sword +1",
      "Plate Armor",
      "Shield"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Stojanow Gate"
    ]
  },
  {
    "id": "por_052",
    "name": "6TH LVL FIGHTER",
    "sourceRecord": 52,
    "attributes": {
      "strength": 17,
      "intelligence": 12,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 14
    },
    "ac": 2,
    "hp": 45,
    "thac0": 13,
    "movement": 12,
    "magicRes": 0,
    "xp": 420,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8+2"
      }
    ],
    "saves": {
      "death": 11,
      "petrification": 12,
      "wand": 13,
      "breath": 13,
      "spell": 14
    },
    "classLevels": [
      "Fighter 6"
    ],
    "items": [
      "Chain Mail +1",
      "Javelin of Lightning",
      "Two-Handed Sword +2"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Civilized Area",
      "Training Hall"
    ]
  },
  {
    "id": "por_099",
    "name": "6TH LVL FIGHTER",
    "sourceRecord": 99,
    "attributes": {
      "strength": 17,
      "intelligence": 12,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 14
    },
    "ac": 2,
    "hp": 45,
    "thac0": 13,
    "movement": 12,
    "magicRes": 0,
    "xp": 420,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8+2"
      }
    ],
    "saves": {
      "death": 11,
      "petrification": 12,
      "wand": 13,
      "breath": 13,
      "spell": 14
    },
    "classLevels": [
      "Fighter 6"
    ],
    "items": [
      "Long Sword +1",
      "Plate Armor",
      "Shield"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Valjevo Castle NE",
      "Valjevo Castle NW",
      "Valjevo Castle SW"
    ]
  },
  {
    "id": "por_100",
    "name": "6TH LVL FIGHTER",
    "sourceRecord": 100,
    "attributes": {
      "strength": 17,
      "intelligence": 12,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 14
    },
    "ac": 2,
    "hp": 45,
    "thac0": 13,
    "movement": 12,
    "magicRes": 0,
    "xp": 420,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8+2"
      }
    ],
    "saves": {
      "death": 11,
      "petrification": 12,
      "wand": 13,
      "breath": 13,
      "spell": 14
    },
    "classLevels": [
      "Fighter 6"
    ],
    "items": [
      "Chain Mail +1",
      "Javelin of Lightning",
      "Two-Handed Sword +2"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Valjevo Castle NE"
    ]
  },
  {
    "id": "por_048",
    "name": "6TH LVL THIEF",
    "sourceRecord": 48,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 18,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 10,
    "hp": 28,
    "thac0": 19,
    "movement": 12,
    "magicRes": 0,
    "xp": 449,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 12,
      "petrification": 11,
      "wand": 12,
      "breath": 15,
      "spell": 13
    },
    "classLevels": [
      "Thief 7"
    ],
    "items": [
      "Leather Armor",
      "Long Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Kovel Mansion"
    ]
  },
  {
    "id": "por_108",
    "name": "6TH LVL THIEF",
    "sourceRecord": 108,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 18,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 10,
    "hp": 28,
    "thac0": 19,
    "movement": 12,
    "magicRes": 0,
    "xp": 449,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 12,
      "petrification": 11,
      "wand": 12,
      "breath": 15,
      "spell": 13
    },
    "classLevels": [
      "Thief 7"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Camouflaged"
    ],
    "spells": [],
    "areas": [
      "Valjevo Castle SE"
    ]
  },
  {
    "id": "por_114",
    "name": "6TH LVL THIEF",
    "sourceRecord": 114,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 18,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 10,
    "hp": 28,
    "thac0": 19,
    "movement": 12,
    "magicRes": 0,
    "xp": 449,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 12,
      "petrification": 11,
      "wand": 12,
      "breath": 15,
      "spell": 13
    },
    "classLevels": [
      "Thief 7"
    ],
    "items": [
      "Leather Armor",
      "Long Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_051",
    "name": "7TH LVL CLERIC",
    "sourceRecord": 51,
    "attributes": {
      "strength": 15,
      "intelligence": 14,
      "wisdom": 18,
      "dexterity": 14,
      "constitution": 14,
      "charisma": 10
    },
    "ac": 8,
    "hp": 42,
    "thac0": 16,
    "movement": 12,
    "magicRes": 0,
    "xp": 686,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 7,
      "petrification": 10,
      "wand": 11,
      "breath": 13,
      "spell": 12
    },
    "classLevels": [
      "Cleric 7"
    ],
    "items": [
      "Banded Armor +2",
      "Mace +2",
      "Potion of Healing"
    ],
    "flags": [],
    "effects": [],
    "spells": [
      "c1: Curse (4)",
      "c2: Hold person (3)",
      "c2: Silence, 15' radius",
      "c3: Bestow curse (2)",
      "c3: Prayer"
    ],
    "areas": [
      "Civilized Area"
    ]
  },
  {
    "id": "por_146",
    "name": "7TH LVL DW FIGH",
    "sourceRecord": 146,
    "attributes": {
      "strength": 17,
      "intelligence": 12,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 14
    },
    "ac": 4,
    "hp": 50,
    "thac0": 14,
    "movement": 12,
    "magicRes": 0,
    "xp": 625,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8+2"
      }
    ],
    "saves": {
      "death": 10,
      "petrification": 11,
      "wand": 12,
      "breath": 12,
      "spell": 13
    },
    "classLevels": [
      "Fighter 7"
    ],
    "items": [
      "Lucern Hammer +1"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_150",
    "name": "7TH LVL FIGHTER",
    "sourceRecord": 150,
    "attributes": {
      "strength": 17,
      "intelligence": 12,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 14
    },
    "ac": 8,
    "hp": 50,
    "thac0": 14,
    "movement": 12,
    "magicRes": 0,
    "xp": 625,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8+2"
      }
    ],
    "saves": {
      "death": 10,
      "petrification": 11,
      "wand": 12,
      "breath": 12,
      "spell": 13
    },
    "classLevels": [
      "Fighter 7"
    ],
    "items": [
      "Plate Armor",
      "Two-Handed Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_147",
    "name": "7TH LVL THIEF",
    "sourceRecord": 147,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 18,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 10,
    "hp": 28,
    "thac0": 19,
    "movement": 12,
    "magicRes": 0,
    "xp": 449,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 12,
      "petrification": 11,
      "wand": 12,
      "breath": 15,
      "spell": 13
    },
    "classLevels": [
      "Thief 7"
    ],
    "items": [
      "Leather Armor",
      "Wand of Magic Missiles"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_053",
    "name": "8TH LVL FIGHTER",
    "sourceRecord": 53,
    "attributes": {
      "strength": 18,
      "intelligence": 12,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 18,
      "charisma": 14
    },
    "ac": 6,
    "hp": 87,
    "thac0": 14,
    "movement": 12,
    "magicRes": 0,
    "xp": 1370,
    "attacks": [
      {
        "count": 2.0,
        "dice": "1d8+2"
      }
    ],
    "saves": {
      "death": 10,
      "petrification": 11,
      "wand": 12,
      "breath": 12,
      "spell": 13
    },
    "classLevels": [
      "Fighter 8"
    ],
    "items": [
      "Plate Mail +2",
      "Ring of Protection +3",
      "Two-Handed Sword +2"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Civilized Area",
      "Council"
    ]
  },
  {
    "id": "por_101",
    "name": "8TH LVL FIGHTER",
    "sourceRecord": 101,
    "attributes": {
      "strength": 18,
      "intelligence": 12,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 18,
      "charisma": 14
    },
    "ac": 6,
    "hp": 87,
    "thac0": 14,
    "movement": 12,
    "magicRes": 0,
    "xp": 1370,
    "attacks": [
      {
        "count": 2.0,
        "dice": "1d8+2"
      }
    ],
    "saves": {
      "death": 10,
      "petrification": 11,
      "wand": 12,
      "breath": 12,
      "spell": 13
    },
    "classLevels": [
      "Fighter 8"
    ],
    "items": [
      "Plate Mail +2",
      "Ring of Protection +3",
      "Two-Handed Sword +2"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Valjevo Castle, Inner Tower"
    ]
  },
  {
    "id": "por_058",
    "name": "ACOLYTE",
    "sourceRecord": 58,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 14,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 10,
    "hp": 8,
    "thac0": 20,
    "movement": 12,
    "magicRes": 0,
    "xp": 18,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4"
      }
    ],
    "saves": {
      "death": 10,
      "petrification": 13,
      "wand": 14,
      "breath": 16,
      "spell": 15
    },
    "classLevels": [
      "Cleric 1"
    ],
    "items": [
      "Chain Mail",
      "Holy Water vial",
      "Mace",
      "Shield",
      "Silver Holy Symbol of Sune"
    ],
    "flags": [],
    "effects": [],
    "spells": [
      "c1: Bless",
      "c1: Cure light wounds",
      "c1: Detect magic"
    ],
    "areas": []
  },
  {
    "id": "por_118",
    "name": "AHNKHEG",
    "sourceRecord": 118,
    "attributes": {
      "strength": 10,
      "intelligence": 3,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 2,
    "hp": 40,
    "thac0": 12,
    "movement": 12,
    "magicRes": 0,
    "xp": 430,
    "attacks": [
      {
        "count": 1.0,
        "dice": "3d6"
      }
    ],
    "saves": {
      "death": 10,
      "petrification": 11,
      "wand": 12,
      "breath": 12,
      "spell": 13
    },
    "classLevels": [
      "Fighter 8"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Anhkheg acid squirt attack",
      "Ankheg acid melee attack"
    ],
    "spells": [],
    "areas": [
      "Caves"
    ]
  },
  {
    "id": "por_035",
    "name": "AIDES",
    "sourceRecord": 35,
    "attributes": {
      "strength": 16,
      "intelligence": 14,
      "wisdom": 14,
      "dexterity": 14,
      "constitution": 14,
      "charisma": 10
    },
    "ac": 8,
    "hp": 18,
    "thac0": 18,
    "movement": 12,
    "magicRes": 0,
    "xp": 89,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 14,
      "wand": 15,
      "breath": 16,
      "spell": 16
    },
    "classLevels": [
      "Fighter 3"
    ],
    "items": [
      "20 x Arrow",
      "Chain Mail",
      "Long Bow",
      "Long Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Stojanow Gate"
    ]
  },
  {
    "id": "por_049",
    "name": "AIDES",
    "sourceRecord": 49,
    "attributes": {
      "strength": 16,
      "intelligence": 14,
      "wisdom": 14,
      "dexterity": 14,
      "constitution": 14,
      "charisma": 10
    },
    "ac": 8,
    "hp": 18,
    "thac0": 18,
    "movement": 12,
    "magicRes": 0,
    "xp": 89,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 14,
      "wand": 15,
      "breath": 16,
      "spell": 16
    },
    "classLevels": [
      "Fighter 3"
    ],
    "items": [
      "20 x Arrow",
      "Chain Mail",
      "Long Bow",
      "Long Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Civilized Area",
      "Council",
      "Training Hall"
    ]
  },
  {
    "id": "por_115",
    "name": "AIDES",
    "sourceRecord": 115,
    "attributes": {
      "strength": 16,
      "intelligence": 14,
      "wisdom": 14,
      "dexterity": 14,
      "constitution": 14,
      "charisma": 10
    },
    "ac": 8,
    "hp": 18,
    "thac0": 18,
    "movement": 12,
    "magicRes": 0,
    "xp": 89,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 14,
      "wand": 15,
      "breath": 16,
      "spell": 16
    },
    "classLevels": [
      "Fighter 3"
    ],
    "items": [
      "20 x Arrow",
      "Chain Mail",
      "Long Bow",
      "Long Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Outpost of Zhentil Keep"
    ]
  },
  {
    "id": "por_138",
    "name": "AIDES",
    "sourceRecord": 138,
    "attributes": {
      "strength": 16,
      "intelligence": 14,
      "wisdom": 14,
      "dexterity": 14,
      "constitution": 14,
      "charisma": 10
    },
    "ac": 8,
    "hp": 18,
    "thac0": 18,
    "movement": 12,
    "magicRes": 0,
    "xp": 89,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 14,
      "wand": 15,
      "breath": 16,
      "spell": 16
    },
    "classLevels": [
      "Fighter 3"
    ],
    "items": [
      "20 x Arrow",
      "Chain Mail",
      "Long Bow",
      "Long Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_102",
    "name": "AL-HYAM DAZID",
    "sourceRecord": 102,
    "attributes": {
      "strength": 10,
      "intelligence": 18,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 9,
    "hp": 22,
    "thac0": 19,
    "movement": 12,
    "magicRes": 0,
    "xp": 526,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4+2"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 11,
      "wand": 9,
      "breath": 13,
      "spell": 10
    },
    "classLevels": [
      "Mage 7"
    ],
    "items": [
      "Bracers AC 3",
      "Ring of Fire Resistance",
      "Wand of Lightning"
    ],
    "flags": [],
    "effects": [],
    "spells": [
      "m1: Magic missile (2)",
      "m1: Reduce",
      "m1: Shield",
      "m2: Mirror image",
      "m2: Stinking cloud",
      "m3: Fireball (2)"
    ],
    "areas": [
      "Valjevo Castle SE"
    ]
  },
  {
    "id": "por_121",
    "name": "AL-HYAM DAZID",
    "sourceRecord": 121,
    "attributes": {
      "strength": 10,
      "intelligence": 18,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 9,
    "hp": 22,
    "thac0": 19,
    "movement": 12,
    "magicRes": 0,
    "xp": 526,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4+2"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 11,
      "wand": 9,
      "breath": 13,
      "spell": 10
    },
    "classLevels": [
      "Mage 7"
    ],
    "items": [
      "Bracers AC 3",
      "Ring of Fire Resistance",
      "Wand of Lightning"
    ],
    "flags": [],
    "effects": [],
    "spells": [
      "m1: Magic missile (2)",
      "m1: Reduce",
      "m1: Shield",
      "m2: Mirror image",
      "m2: Stinking cloud",
      "m3: Fireball (2)"
    ],
    "areas": [
      "Outpost of Zhentil Keep"
    ]
  },
  {
    "id": "por_123",
    "name": "BANDIT",
    "sourceRecord": 123,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 6,
    "hp": 6,
    "thac0": 19,
    "movement": 12,
    "magicRes": 0,
    "xp": 16,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [],
    "items": [
      "20 x Arrow",
      "Leather Armor",
      "Long Bow",
      "Shield",
      "Short Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_033",
    "name": "BASILISK",
    "sourceRecord": 33,
    "attributes": {
      "strength": 10,
      "intelligence": 3,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 4,
    "hp": 31,
    "thac0": 13,
    "movement": 6,
    "magicRes": 0,
    "xp": 1248,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d10"
      }
    ],
    "saves": {
      "death": 10,
      "petrification": 11,
      "wand": 12,
      "breath": 12,
      "spell": 13
    },
    "classLevels": [
      "Fighter 7"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Petrifying gaze",
      "Reflectable gaze"
    ],
    "spells": [],
    "areas": [
      "Mendor's Library"
    ]
  },
  {
    "id": "por_090",
    "name": "BASILISK",
    "sourceRecord": 90,
    "attributes": {
      "strength": 10,
      "intelligence": 3,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 4,
    "hp": 31,
    "thac0": 13,
    "movement": 6,
    "magicRes": 0,
    "xp": 1248,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d10"
      }
    ],
    "saves": {
      "death": 10,
      "petrification": 11,
      "wand": 12,
      "breath": 12,
      "spell": 13
    },
    "classLevels": [
      "Fighter 7"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Petrifying gaze",
      "Reflectable gaze"
    ],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_124",
    "name": "BUCCANEER",
    "sourceRecord": 124,
    "attributes": {
      "strength": 16,
      "intelligence": 14,
      "wisdom": 14,
      "dexterity": 14,
      "constitution": 14,
      "charisma": 10
    },
    "ac": 10,
    "hp": 4,
    "thac0": 20,
    "movement": 12,
    "magicRes": 0,
    "xp": 14,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Buccaneers Base"
    ]
  },
  {
    "id": "por_037",
    "name": "BUGBEAR",
    "sourceRecord": 37,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 16,
    "thac0": 16,
    "movement": 9,
    "magicRes": 0,
    "xp": 199,
    "attacks": [
      {
        "count": 1.0,
        "dice": "2d4"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 14,
      "wand": 15,
      "breath": 16,
      "spell": 16
    },
    "classLevels": [
      "Fighter 4"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Slums",
      "Stojanow Gate"
    ]
  },
  {
    "id": "por_127",
    "name": "CAPTAIN",
    "sourceRecord": 127,
    "attributes": {
      "strength": 18,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 17,
      "constitution": 17,
      "charisma": 14
    },
    "ac": 10,
    "hp": 110,
    "thac0": 12,
    "movement": 9,
    "magicRes": 0,
    "xp": 2440,
    "attacks": [
      {
        "count": 2.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 8,
      "petrification": 9,
      "wand": 10,
      "breath": 9,
      "spell": 11
    },
    "classLevels": [
      "Fighter 10"
    ],
    "items": [
      "15 x Quarrel",
      "Light Crossbow",
      "Long Sword +4",
      "Plate Mail +3",
      "Shield +2"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Buccaneers Base"
    ]
  },
  {
    "id": "por_119",
    "name": "CENTAUR",
    "sourceRecord": 119,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 20,
    "thac0": 15,
    "movement": 18,
    "magicRes": 0,
    "xp": 165,
    "attacks": [
      {
        "count": 2.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 11,
      "petrification": 12,
      "wand": 13,
      "breath": 13,
      "spell": 14
    },
    "classLevels": [
      "Fighter 4"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_113",
    "name": "COMMANDANT",
    "sourceRecord": 113,
    "attributes": {
      "strength": 18,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 16,
      "constitution": 17,
      "charisma": 14
    },
    "ac": 7,
    "hp": 100,
    "thac0": 12,
    "movement": 9,
    "magicRes": 0,
    "xp": 1800,
    "attacks": [
      {
        "count": 2.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 8,
      "petrification": 9,
      "wand": 10,
      "breath": 9,
      "spell": 11
    },
    "classLevels": [
      "Fighter 9"
    ],
    "items": [
      "3 x Potion Extra Healing",
      "Javelin of Lightning",
      "Long Sword +2",
      "Plate Mail +2",
      "Ring of Fire Resistance",
      "Shield +1"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Outpost of Zhentil Keep"
    ]
  },
  {
    "id": "por_050",
    "name": "CORPORAL",
    "sourceRecord": 50,
    "attributes": {
      "strength": 16,
      "intelligence": 14,
      "wisdom": 14,
      "dexterity": 14,
      "constitution": 14,
      "charisma": 10
    },
    "ac": 6,
    "hp": 13,
    "thac0": 20,
    "movement": 12,
    "magicRes": 0,
    "xp": 46,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 2"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Council"
    ]
  },
  {
    "id": "por_116",
    "name": "CORPORAL",
    "sourceRecord": 116,
    "attributes": {
      "strength": 16,
      "intelligence": 14,
      "wisdom": 14,
      "dexterity": 14,
      "constitution": 14,
      "charisma": 10
    },
    "ac": 6,
    "hp": 13,
    "thac0": 20,
    "movement": 12,
    "magicRes": 0,
    "xp": 46,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 2"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Caves",
      "Outpost of Zhentil Keep"
    ]
  },
  {
    "id": "por_062",
    "name": "CURATE",
    "sourceRecord": 62,
    "attributes": {
      "strength": 10,
      "intelligence": 15,
      "wisdom": 16,
      "dexterity": 10,
      "constitution": 9,
      "charisma": 15
    },
    "ac": 9,
    "hp": 26,
    "thac0": 18,
    "movement": 12,
    "magicRes": 0,
    "xp": 220,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4+2"
      }
    ],
    "saves": {
      "death": 9,
      "petrification": 12,
      "wand": 13,
      "breath": 15,
      "spell": 14
    },
    "classLevels": [
      "Cleric 4"
    ],
    "items": [
      "Mace",
      "Plate Mail"
    ],
    "flags": [],
    "effects": [],
    "spells": [
      "c1: Bless (2)",
      "c1: Cure light wounds (3)",
      "c2: Hold person (2)",
      "c2: Slow poison",
      "c2: Spiritual hammer"
    ],
    "areas": []
  },
  {
    "id": "por_149",
    "name": "DIANE",
    "sourceRecord": 149,
    "attributes": {
      "strength": 10,
      "intelligence": 15,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 9,
    "hp": 20,
    "thac0": 20,
    "movement": 12,
    "magicRes": 0,
    "xp": 190,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4+2"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 13,
      "wand": 11,
      "breath": 15,
      "spell": 12
    },
    "classLevels": [
      "Mage 5"
    ],
    "items": [
      "Dagger"
    ],
    "flags": [],
    "effects": [],
    "spells": [
      "m1: Magic missile (7)"
    ],
    "areas": []
  },
  {
    "id": "por_015",
    "name": "DIRTEN",
    "sourceRecord": 15,
    "attributes": {
      "strength": 10,
      "intelligence": 15,
      "wisdom": 16,
      "dexterity": 10,
      "constitution": 9,
      "charisma": 15
    },
    "ac": 9,
    "hp": 26,
    "thac0": 18,
    "movement": 12,
    "magicRes": 0,
    "xp": 306,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4+2"
      }
    ],
    "saves": {
      "death": 9,
      "petrification": 12,
      "wand": 13,
      "breath": 15,
      "spell": 14
    },
    "classLevels": [
      "Cleric 5"
    ],
    "items": [
      "Chain Mail",
      "Mace",
      "Wooden Holy Symbol"
    ],
    "flags": [],
    "effects": [],
    "spells": [
      "c1: Bless (2)",
      "c1: Cure light wounds (3)",
      "c2: Find traps",
      "c2: Hold person (2)",
      "c2: Slow poison",
      "c2: Spiritual hammer",
      "c3: Prayer"
    ],
    "areas": []
  },
  {
    "id": "por_057",
    "name": "DIRTEN",
    "sourceRecord": 57,
    "attributes": {
      "strength": 10,
      "intelligence": 15,
      "wisdom": 16,
      "dexterity": 10,
      "constitution": 9,
      "charisma": 15
    },
    "ac": 9,
    "hp": 26,
    "thac0": 18,
    "movement": 12,
    "magicRes": 0,
    "xp": 306,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4+2"
      }
    ],
    "saves": {
      "death": 9,
      "petrification": 12,
      "wand": 13,
      "breath": 15,
      "spell": 14
    },
    "classLevels": [
      "Cleric 5"
    ],
    "items": [
      "Chain Mail",
      "Mace",
      "Wooden Holy Symbol"
    ],
    "flags": [],
    "effects": [],
    "spells": [
      "c1: Bless (2)",
      "c1: Cure light wounds (3)",
      "c2: Find traps",
      "c2: Hold person (2)",
      "c2: Slow poison",
      "c2: Spiritual hammer",
      "c3: Prayer"
    ],
    "areas": [
      "Civilized Area"
    ]
  },
  {
    "id": "por_143",
    "name": "DISPLACER BEAST",
    "sourceRecord": 143,
    "attributes": {
      "strength": 10,
      "intelligence": 3,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 2,
    "hp": 30,
    "thac0": 13,
    "movement": 15,
    "magicRes": 0,
    "xp": 715,
    "attacks": [
      {
        "count": 2.0,
        "dice": "2d4"
      }
    ],
    "saves": {
      "death": 9,
      "petrification": 10,
      "wand": 11,
      "breath": 11,
      "spell": 12
    },
    "classLevels": [
      "Fighter 6"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "World Map"
    ]
  },
  {
    "id": "por_144",
    "name": "DRIDER",
    "sourceRecord": 144,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 3,
    "hp": 36,
    "thac0": 13,
    "movement": 12,
    "magicRes": 0,
    "xp": 1163,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 11,
      "wand": 9,
      "breath": 13,
      "spell": 10
    },
    "classLevels": [
      "Fighter 7, Mage 7"
    ],
    "items": [
      "4 x Arrow",
      "Composite Long Bow",
      "Shield"
    ],
    "flags": [],
    "effects": [
      "Paralysis melee attack (-2 to save)"
    ],
    "spells": [
      "m1: Magic missile",
      "m1: Sleep (2)",
      "m2: Detect invisibility",
      "m2: Ray of enfeeblement",
      "m2: Stinking cloud",
      "m3: Blink",
      "m3: Fireball (2)",
      "m3: Haste"
    ],
    "areas": []
  },
  {
    "id": "por_166",
    "name": "DRYTHH",
    "sourceRecord": 166,
    "attributes": {
      "strength": 18,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 3,
    "hp": 18,
    "thac0": 14,
    "movement": 6,
    "magicRes": 0,
    "xp": 132,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d10"
      },
      {
        "count": 2.0,
        "dice": "1d4"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 14,
      "wand": 15,
      "breath": 16,
      "spell": 16
    },
    "classLevels": [
      "Fighter 4"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Lizard Men Keep"
    ]
  },
  {
    "id": "por_112",
    "name": "DWARVEN FIGHTER",
    "sourceRecord": 112,
    "attributes": {
      "strength": 18,
      "intelligence": 14,
      "wisdom": 14,
      "dexterity": 14,
      "constitution": 14,
      "charisma": 10
    },
    "ac": 8,
    "hp": 50,
    "thac0": 16,
    "movement": 12,
    "magicRes": 0,
    "xp": 450,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 11,
      "petrification": 12,
      "wand": 13,
      "breath": 13,
      "spell": 14
    },
    "classLevels": [
      "Fighter 6"
    ],
    "items": [
      "Chain Mail +1",
      "Gauntlets of Ogre Power",
      "Long Sword +1"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Outpost of Zhentil Keep"
    ]
  },
  {
    "id": "por_084",
    "name": "EFREETI",
    "sourceRecord": 84,
    "attributes": {
      "strength": 19,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 2,
    "hp": 55,
    "thac0": 10,
    "movement": 24,
    "magicRes": 0,
    "xp": 2720,
    "attacks": [
      {
        "count": 1.0,
        "dice": "3d8"
      }
    ],
    "saves": {
      "death": 8,
      "petrification": 9,
      "wand": 9,
      "breath": 9,
      "spell": 10
    },
    "classLevels": [
      "Fighter 10"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Efreeti fire resistance"
    ],
    "spells": [],
    "areas": [
      "Valhingen Graveyard"
    ]
  },
  {
    "id": "por_172",
    "name": "EFREETI",
    "sourceRecord": 172,
    "attributes": {
      "strength": 19,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 2,
    "hp": 55,
    "thac0": 10,
    "movement": 24,
    "magicRes": 0,
    "xp": 2720,
    "attacks": [
      {
        "count": 1.0,
        "dice": "3d8"
      }
    ],
    "saves": {
      "death": 8,
      "petrification": 9,
      "wand": 9,
      "breath": 9,
      "spell": 10
    },
    "classLevels": [
      "Fighter 10"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Efreeti fire resistance"
    ],
    "spells": [],
    "areas": [
      "Kobold Caves"
    ]
  },
  {
    "id": "por_103",
    "name": "ENVOY",
    "sourceRecord": 103,
    "attributes": {
      "strength": 18,
      "intelligence": 18,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 17,
      "charisma": 14
    },
    "ac": 2,
    "hp": 45,
    "thac0": 13,
    "movement": 12,
    "magicRes": 0,
    "xp": 495,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8+2"
      }
    ],
    "saves": {
      "death": 11,
      "petrification": 12,
      "wand": 11,
      "breath": 13,
      "spell": 12
    },
    "classLevels": [
      "Fighter 6, Mage 6"
    ],
    "items": [
      "Plate",
      "Two-Handed Sword +2"
    ],
    "flags": [],
    "effects": [],
    "spells": [
      "m1: Magic missile (2)",
      "m1: Sleep (2)",
      "m2: Mirror image",
      "m2: Stinking cloud",
      "m3: Fireball"
    ],
    "areas": [
      "Valjevo Castle NE"
    ]
  },
  {
    "id": "por_164",
    "name": "ENVOY",
    "sourceRecord": 164,
    "attributes": {
      "strength": 18,
      "intelligence": 18,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 17,
      "charisma": 14
    },
    "ac": 2,
    "hp": 45,
    "thac0": 13,
    "movement": 12,
    "magicRes": 0,
    "xp": 495,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8+2"
      }
    ],
    "saves": {
      "death": 11,
      "petrification": 12,
      "wand": 11,
      "breath": 13,
      "spell": 12
    },
    "classLevels": [
      "Fighter 6, Mage 6"
    ],
    "items": [
      "Plate",
      "Two-Handed Sword +2"
    ],
    "flags": [],
    "effects": [],
    "spells": [
      "m1: Magic missile (2)",
      "m1: Sleep (2)",
      "m2: Mirror image",
      "m2: Stinking cloud",
      "m3: Fireball"
    ],
    "areas": [
      "Kobold Caves"
    ]
  },
  {
    "id": "por_038",
    "name": "ETTIN",
    "sourceRecord": 38,
    "attributes": {
      "strength": 19,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 3,
    "hp": 50,
    "thac0": 10,
    "movement": 12,
    "magicRes": 0,
    "xp": 2650,
    "attacks": [
      {
        "count": 1.0,
        "dice": "2d8"
      },
      {
        "count": 1.0,
        "dice": "3d6"
      }
    ],
    "saves": {
      "death": 8,
      "petrification": 9,
      "wand": 10,
      "breath": 9,
      "spell": 11
    },
    "classLevels": [
      "Fighter 10"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Stojanow Gate"
    ]
  },
  {
    "id": "por_063",
    "name": "EVOKER",
    "sourceRecord": 63,
    "attributes": {
      "strength": 10,
      "intelligence": 15,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 9,
      "charisma": 15
    },
    "ac": 9,
    "hp": 6,
    "thac0": 20,
    "movement": 12,
    "magicRes": 0,
    "xp": 53,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4+2"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 13,
      "wand": 11,
      "breath": 15,
      "spell": 12
    },
    "classLevels": [
      "Mage 2"
    ],
    "items": [
      "6 x Dart",
      "Dagger"
    ],
    "flags": [],
    "effects": [],
    "spells": [
      "m1: Sleep (2)"
    ],
    "areas": []
  },
  {
    "id": "por_071",
    "name": "FERRAN MARTINEZ",
    "sourceRecord": 71,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 2,
    "hp": 38,
    "thac0": 12,
    "movement": 30,
    "magicRes": 0,
    "xp": 2030,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 10,
      "petrification": 11,
      "wand": 12,
      "breath": 12,
      "spell": 13
    },
    "classLevels": [
      "Fighter 8, Undead 9"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Drain 2 levels",
      "Immunity to cold",
      "Immunity to non-magical weapons",
      "Immunity to paralysis (hold person, wand)",
      "Immunity to paralysis/poison",
      "Immunity to sleep/charm"
    ],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_096",
    "name": "FIRE GIANT",
    "sourceRecord": 96,
    "attributes": {
      "strength": 22,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 3,
    "hp": 59,
    "thac0": 9,
    "movement": 12,
    "magicRes": 0,
    "xp": 3644,
    "attacks": [
      {
        "count": 1.0,
        "dice": "5d6"
      }
    ],
    "saves": {
      "death": 7,
      "petrification": 8,
      "wand": 9,
      "breath": 8,
      "spell": 10
    },
    "classLevels": [
      "Fighter 12"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Boulder evasion",
      "Immunity to fire"
    ],
    "spells": [],
    "areas": [
      "Valjevo Castle NE",
      "Valjevo Castle NW",
      "Valjevo Castle SE",
      "Valjevo Castle SW"
    ]
  },
  {
    "id": "por_104",
    "name": "GENHEERIS",
    "sourceRecord": 104,
    "attributes": {
      "strength": 10,
      "intelligence": 18,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 9,
    "hp": 22,
    "thac0": 19,
    "movement": 12,
    "magicRes": 0,
    "xp": 526,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4+2"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 11,
      "wand": 9,
      "breath": 13,
      "spell": 10
    },
    "classLevels": [
      "Mage 7"
    ],
    "items": [
      "Wand of Lightning"
    ],
    "flags": [],
    "effects": [],
    "spells": [
      "m1: Magic missile (3)",
      "m1: Sleep",
      "m2: Stinking cloud (2)",
      "m3: Fireball (2)"
    ],
    "areas": [
      "Valjevo Castle, Inner Tower"
    ]
  },
  {
    "id": "por_085",
    "name": "GHOUL",
    "sourceRecord": 85,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 6,
    "hp": 10,
    "thac0": 16,
    "movement": 9,
    "magicRes": 0,
    "xp": 85,
    "attacks": [
      {
        "count": 2.0,
        "dice": "1d3"
      },
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 2, Undead 3"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Immunity to sleep/charm",
      "Paralysis melee attack (does not affect elves)"
    ],
    "spells": [],
    "areas": [
      "Cadorna Textile House",
      "Valhingen Graveyard"
    ]
  },
  {
    "id": "por_162",
    "name": "GHOUL",
    "sourceRecord": 162,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 6,
    "hp": 10,
    "thac0": 16,
    "movement": 9,
    "magicRes": 0,
    "xp": 85,
    "attacks": [
      {
        "count": 2.0,
        "dice": "1d3"
      },
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 2, Undead 3"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Immunity to sleep/charm",
      "Paralysis melee attack (does not affect elves)"
    ],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_160",
    "name": "GIANT LIZARD",
    "sourceRecord": 160,
    "attributes": {
      "strength": 10,
      "intelligence": 3,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 16,
    "thac0": 16,
    "movement": 15,
    "magicRes": 0,
    "xp": 124,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 14,
      "wand": 15,
      "breath": 16,
      "spell": 16
    },
    "classLevels": [
      "Fighter 4"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Caves",
      "Kuto's Well",
      "Lizard Men Keep"
    ]
  },
  {
    "id": "por_120",
    "name": "GIANT MANTIS",
    "sourceRecord": 120,
    "attributes": {
      "strength": 10,
      "intelligence": 3,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 3,
    "hp": 55,
    "thac0": 10,
    "movement": 12,
    "magicRes": 0,
    "xp": 2120,
    "attacks": [
      {
        "count": 1.0,
        "dice": "2d6"
      }
    ],
    "saves": {
      "death": 8,
      "petrification": 9,
      "wand": 9,
      "breath": 9,
      "spell": 10
    },
    "classLevels": [
      "Fighter 10"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Bite and hold attack"
    ],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_009",
    "name": "GIANT SKELETON",
    "sourceRecord": 9,
    "attributes": {
      "strength": 19,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 2,
    "hp": 28,
    "thac0": 15,
    "movement": 12,
    "magicRes": 0,
    "xp": 270,
    "attacks": [
      {
        "count": 1.0,
        "dice": "4d6"
      }
    ],
    "saves": {
      "death": 11,
      "petrification": 12,
      "wand": 13,
      "breath": 13,
      "spell": 14
    },
    "classLevels": [
      "Fighter 5, Undead 8"
    ],
    "items": [
      "Short Bow"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_074",
    "name": "GIANT SKELETON",
    "sourceRecord": 74,
    "attributes": {
      "strength": 19,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 2,
    "hp": 28,
    "thac0": 15,
    "movement": 12,
    "magicRes": 0,
    "xp": 270,
    "attacks": [
      {
        "count": 1.0,
        "dice": "4d6"
      }
    ],
    "saves": {
      "death": 11,
      "petrification": 12,
      "wand": 13,
      "breath": 13,
      "spell": 14
    },
    "classLevels": [
      "Fighter 5, Undead 8"
    ],
    "items": [
      "Short Bow"
    ],
    "flags": [],
    "effects": [
      "Half damage from piercing/slashing weapons",
      "Immunity to cold",
      "Immunity to sleep/charm/paralysis/poison",
      "Vulnerability to holy water"
    ],
    "spells": [],
    "areas": [
      "Valhingen Graveyard"
    ]
  },
  {
    "id": "por_097",
    "name": "GIANT SNAKE",
    "sourceRecord": 97,
    "attributes": {
      "strength": 10,
      "intelligence": 3,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 25,
    "thac0": 15,
    "movement": 12,
    "magicRes": 0,
    "xp": 260,
    "attacks": [
      {
        "count": 1.0,
        "dice": "3d6+2"
      }
    ],
    "saves": {
      "death": 11,
      "petrification": 12,
      "wand": 13,
      "breath": 13,
      "spell": 14
    },
    "classLevels": [
      "Fighter 5"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Poison attack"
    ],
    "spells": [],
    "areas": [
      "Valjevo Castle NW",
      "Valjevo Castle SE"
    ]
  },
  {
    "id": "por_117",
    "name": "GIANT SNAKE",
    "sourceRecord": 117,
    "attributes": {
      "strength": 10,
      "intelligence": 3,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 25,
    "thac0": 15,
    "movement": 12,
    "magicRes": 0,
    "xp": 260,
    "attacks": [
      {
        "count": 1.0,
        "dice": "3d6+2"
      }
    ],
    "saves": {
      "death": 11,
      "petrification": 12,
      "wand": 13,
      "breath": 13,
      "spell": 14
    },
    "classLevels": [
      "Fighter 5"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Poison attack"
    ],
    "spells": [],
    "areas": [
      "Caves"
    ]
  },
  {
    "id": "por_039",
    "name": "GNOLL",
    "sourceRecord": 39,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 10,
    "thac0": 16,
    "movement": 9,
    "magicRes": 0,
    "xp": 48,
    "attacks": [
      {
        "count": 1.0,
        "dice": "2d4"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 2"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Slums"
    ]
  },
  {
    "id": "por_163",
    "name": "GNOLL",
    "sourceRecord": 163,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 10,
    "thac0": 16,
    "movement": 9,
    "magicRes": 0,
    "xp": 48,
    "attacks": [
      {
        "count": 1.0,
        "dice": "2d4"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 2"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Caves"
    ]
  },
  {
    "id": "por_001",
    "name": "GOBLIN GUARD",
    "sourceRecord": 1,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 7,
    "hp": 4,
    "thac0": 19,
    "movement": 6,
    "magicRes": 0,
    "xp": 14,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [],
    "items": [
      "Shield",
      "Short Sword",
      "Studded Leather Armor"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Podol Plaza"
    ]
  },
  {
    "id": "por_018",
    "name": "GOBLIN GUARD",
    "sourceRecord": 18,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 7,
    "hp": 4,
    "thac0": 19,
    "movement": 6,
    "magicRes": 0,
    "xp": 14,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [],
    "items": [
      "Shield",
      "Short Sword",
      "Studded Leather Armor"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Slums"
    ]
  },
  {
    "id": "por_002",
    "name": "GOBLIN LEADER",
    "sourceRecord": 2,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 12,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 7,
    "thac0": 19,
    "movement": 6,
    "magicRes": 0,
    "xp": 17,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [],
    "items": [
      "20 x Arrow",
      "Long Bow",
      "Scale Mail",
      "Shield",
      "Short Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_019",
    "name": "GOBLIN LEADER",
    "sourceRecord": 19,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 12,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 7,
    "thac0": 19,
    "movement": 6,
    "magicRes": 0,
    "xp": 17,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [],
    "items": [
      "20 x Arrow",
      "Long Bow",
      "Scale Mail",
      "Shield",
      "Short Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Slums"
    ]
  },
  {
    "id": "por_026",
    "name": "GOBLIN LEADER",
    "sourceRecord": 26,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 12,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 7,
    "thac0": 19,
    "movement": 6,
    "magicRes": 0,
    "xp": 17,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [],
    "items": [
      "Leather Armor +1",
      "Shield",
      "Short Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Slums"
    ]
  },
  {
    "id": "por_078",
    "name": "GRISHNAK",
    "sourceRecord": 78,
    "attributes": {
      "strength": 9,
      "intelligence": 16,
      "wisdom": 16,
      "dexterity": 13,
      "constitution": 11,
      "charisma": 5
    },
    "ac": 5,
    "hp": 24,
    "thac0": 13,
    "movement": 9,
    "magicRes": 0,
    "xp": 419,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4"
      }
    ],
    "saves": {
      "death": 9,
      "petrification": 12,
      "wand": 11,
      "breath": 15,
      "spell": 12
    },
    "classLevels": [
      "Cleric 6, Mage 6"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [
      "c1: Cause light wounds",
      "c1: Cure light wounds (2)",
      "c1: Curse",
      "c1: Protection from good",
      "c2: Hold person (4)",
      "c2: Silence, 15' radius",
      "c3: Bestow curse",
      "c3: Cause disease"
    ],
    "areas": [
      "Cadorna Textile House"
    ]
  },
  {
    "id": "por_122",
    "name": "GUARD",
    "sourceRecord": 122,
    "attributes": {
      "strength": 16,
      "intelligence": 14,
      "wisdom": 14,
      "dexterity": 14,
      "constitution": 14,
      "charisma": 10
    },
    "ac": 10,
    "hp": 4,
    "thac0": 20,
    "movement": 12,
    "magicRes": 0,
    "xp": 14,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [],
    "items": [
      "Leather Armor",
      "Light Crossbow",
      "Long Sword",
      "Quarrel"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Outpost of Zhentil Keep"
    ]
  },
  {
    "id": "por_135",
    "name": "HASSAD",
    "sourceRecord": 135,
    "attributes": {
      "strength": 17,
      "intelligence": 12,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 14
    },
    "ac": 2,
    "hp": 45,
    "thac0": 13,
    "movement": 12,
    "magicRes": 0,
    "xp": 420,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8+2"
      }
    ],
    "saves": {
      "death": 11,
      "petrification": 12,
      "wand": 13,
      "breath": 13,
      "spell": 14
    },
    "classLevels": [
      "Fighter 6"
    ],
    "items": [
      "Long Sword +2",
      "Scale Mail +2",
      "Shield +1"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Nomad Camp"
    ]
  },
  {
    "id": "por_059",
    "name": "HERO",
    "sourceRecord": 59,
    "attributes": {
      "strength": 17,
      "intelligence": 14,
      "wisdom": 14,
      "dexterity": 17,
      "constitution": 17,
      "charisma": 10
    },
    "ac": 10,
    "hp": 35,
    "thac0": 18,
    "movement": 12,
    "magicRes": 0,
    "xp": 200,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 14,
      "wand": 15,
      "breath": 16,
      "spell": 16
    },
    "classLevels": [
      "Fighter 4"
    ],
    "items": [
      "60 x Arrow",
      "Long Bow",
      "Plate Mail +1",
      "Two-Handed Sword +1"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_036",
    "name": "HILL GIANT",
    "sourceRecord": 36,
    "attributes": {
      "strength": 19,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 0,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 4,
    "hp": 41,
    "thac0": 12,
    "movement": 12,
    "magicRes": 0,
    "xp": 1892,
    "attacks": [
      {
        "count": 1.0,
        "dice": "2d8"
      }
    ],
    "saves": {
      "death": 8,
      "petrification": 9,
      "wand": 10,
      "breath": 9,
      "spell": 11
    },
    "classLevels": [
      "Fighter 9"
    ],
    "items": [
      "Boulder",
      "Boulder"
    ],
    "flags": [],
    "effects": [
      "Boulder evasion"
    ],
    "spells": [],
    "areas": [
      "Stojanow Gate"
    ]
  },
  {
    "id": "por_095",
    "name": "HILL GIANT",
    "sourceRecord": 95,
    "attributes": {
      "strength": 19,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 0,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 4,
    "hp": 41,
    "thac0": 12,
    "movement": 12,
    "magicRes": 0,
    "xp": 1892,
    "attacks": [
      {
        "count": 1.0,
        "dice": "2d8"
      }
    ],
    "saves": {
      "death": 8,
      "petrification": 9,
      "wand": 10,
      "breath": 9,
      "spell": 11
    },
    "classLevels": [
      "Fighter 9"
    ],
    "items": [
      "Boulder",
      "Boulder"
    ],
    "flags": [],
    "effects": [
      "Boulder evasion"
    ],
    "spells": [],
    "areas": [
      "Valjevo Castle NE",
      "Valjevo Castle NW",
      "Valjevo Castle SE",
      "Valjevo Castle SW"
    ]
  },
  {
    "id": "por_168",
    "name": "HIPPOGRIFF",
    "sourceRecord": 168,
    "attributes": {
      "strength": 10,
      "intelligence": 3,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 18,
    "thac0": 15,
    "movement": 36,
    "magicRes": 0,
    "xp": 132,
    "attacks": [
      {
        "count": 2.0,
        "dice": "1d6"
      },
      {
        "count": 1.0,
        "dice": "1d10"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 14,
      "wand": 15,
      "breath": 16,
      "spell": 16
    },
    "classLevels": [
      "Cleric 255, Fighter 255, Mage 255, Thief 255"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_006",
    "name": "HOBGOBLIN LDR",
    "sourceRecord": 6,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 6,
    "thac0": 18,
    "movement": 9,
    "magicRes": 0,
    "xp": 32,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 2"
    ],
    "items": [
      "12 x Arrow",
      "Long Bow",
      "Long Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_023",
    "name": "HOBGOBLIN LDR",
    "sourceRecord": 23,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 6,
    "thac0": 18,
    "movement": 9,
    "magicRes": 0,
    "xp": 32,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 2"
    ],
    "items": [
      "12 x Arrow",
      "Long Bow",
      "Long Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Slums"
    ]
  },
  {
    "id": "por_067",
    "name": "HOBGOBLIN LDR",
    "sourceRecord": 67,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 6,
    "thac0": 18,
    "movement": 9,
    "magicRes": 0,
    "xp": 32,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 2"
    ],
    "items": [
      "12 x Arrow",
      "Long Bow",
      "Long Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Cadorna Textile House"
    ]
  },
  {
    "id": "por_005",
    "name": "HOBGOBLIN",
    "sourceRecord": 5,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 6,
    "thac0": 18,
    "movement": 9,
    "magicRes": 0,
    "xp": 32,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 2"
    ],
    "items": [
      "Long Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Podol Plaza"
    ]
  },
  {
    "id": "por_022",
    "name": "HOBGOBLIN",
    "sourceRecord": 22,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 6,
    "thac0": 18,
    "movement": 9,
    "magicRes": 0,
    "xp": 32,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 2"
    ],
    "items": [
      "Long Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Slums"
    ]
  },
  {
    "id": "por_066",
    "name": "HOBGOBLIN",
    "sourceRecord": 66,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 6,
    "thac0": 18,
    "movement": 9,
    "magicRes": 0,
    "xp": 32,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 2"
    ],
    "items": [
      "Long Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Cadorna Textile House"
    ]
  },
  {
    "id": "por_083",
    "name": "HUGE SCORPION",
    "sourceRecord": 83,
    "attributes": {
      "strength": 10,
      "intelligence": 3,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 4,
    "hp": 20,
    "thac0": 15,
    "movement": 12,
    "magicRes": 0,
    "xp": 190,
    "attacks": [
      {
        "count": 2.0,
        "dice": "1d8"
      },
      {
        "count": 1.0,
        "dice": "1d3"
      }
    ],
    "saves": {
      "death": 11,
      "petrification": 12,
      "wand": 13,
      "breath": 13,
      "spell": 14
    },
    "classLevels": [
      "Fighter 5"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Poison attack"
    ],
    "spells": [],
    "areas": [
      "Cadorna Textile House"
    ]
  },
  {
    "id": "por_079",
    "name": "JUJU ZOMBIE",
    "sourceRecord": 79,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 6,
    "hp": 24,
    "thac0": 13,
    "movement": 9,
    "magicRes": 0,
    "xp": 206,
    "attacks": [
      {
        "count": 1.0,
        "dice": "3d4"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 14,
      "wand": 15,
      "breath": 16,
      "spell": 16
    },
    "classLevels": [
      "Fighter 4, Undead 9"
    ],
    "items": [
      "Short Bow"
    ],
    "flags": [],
    "effects": [
      "Half damage from blunt/piercing weapons",
      "Half damage from fire",
      "Immunity to cold",
      "Immunity to electricity",
      "Immunity to non-magical weapons",
      "Immunity to sleep/charm/paralysis/poison",
      "Vulnerability to holy water"
    ],
    "spells": [],
    "areas": [
      "Valhingen Graveyard"
    ]
  },
  {
    "id": "por_017",
    "name": "KOBOLD LEADER",
    "sourceRecord": 17,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 12,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 7,
    "hp": 4,
    "thac0": 19,
    "movement": 6,
    "magicRes": 0,
    "xp": 16,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [],
    "items": [
      "20 x Arrow",
      "Shield",
      "Short Bow",
      "Short Sword",
      "Studded Leather Armor"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_025",
    "name": "KOBOLD LEADER",
    "sourceRecord": 25,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 12,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 7,
    "hp": 4,
    "thac0": 19,
    "movement": 6,
    "magicRes": 0,
    "xp": 16,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [],
    "items": [
      "Bracers AC 6",
      "Shield",
      "Short Sword",
      "Studded Leather Armor"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Slums"
    ]
  },
  {
    "id": "por_156",
    "name": "KOBOLD LEADER",
    "sourceRecord": 156,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 12,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 7,
    "hp": 4,
    "thac0": 19,
    "movement": 6,
    "magicRes": 0,
    "xp": 16,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [],
    "items": [
      "20 x Arrow",
      "Shield",
      "Short Bow",
      "Short Sword",
      "Studded Leather Armor"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Caves",
      "Kobold Caves",
      "Kuto's Well"
    ]
  },
  {
    "id": "por_016",
    "name": "KOBOLD",
    "sourceRecord": 16,
    "attributes": {
      "strength": 10,
      "intelligence": 6,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 7,
    "hp": 3,
    "thac0": 21,
    "movement": 6,
    "magicRes": 0,
    "xp": 8,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4"
      }
    ],
    "saves": {
      "death": 16,
      "petrification": 17,
      "wand": 18,
      "breath": 20,
      "spell": 19
    },
    "classLevels": [],
    "items": [
      "Short Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Mendor's Library",
      "Slums"
    ]
  },
  {
    "id": "por_131",
    "name": "KOBOLD",
    "sourceRecord": 131,
    "attributes": {
      "strength": 10,
      "intelligence": 6,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 7,
    "hp": 3,
    "thac0": 21,
    "movement": 6,
    "magicRes": 0,
    "xp": 8,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4"
      }
    ],
    "saves": {
      "death": 16,
      "petrification": 17,
      "wand": 18,
      "breath": 20,
      "spell": 19
    },
    "classLevels": [],
    "items": [
      "Short Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Nomad Camp"
    ]
  },
  {
    "id": "por_154",
    "name": "KOBOLD",
    "sourceRecord": 154,
    "attributes": {
      "strength": 10,
      "intelligence": 6,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 7,
    "hp": 3,
    "thac0": 21,
    "movement": 6,
    "magicRes": 0,
    "xp": 8,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4"
      }
    ],
    "saves": {
      "death": 16,
      "petrification": 17,
      "wand": 18,
      "breath": 20,
      "spell": 19
    },
    "classLevels": [],
    "items": [
      "30 x Arrow",
      "Short Bow",
      "Short Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Nomad Camp"
    ]
  },
  {
    "id": "por_155",
    "name": "KOBOLD",
    "sourceRecord": 155,
    "attributes": {
      "strength": 10,
      "intelligence": 6,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 7,
    "hp": 3,
    "thac0": 21,
    "movement": 6,
    "magicRes": 0,
    "xp": 8,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4"
      }
    ],
    "saves": {
      "death": 16,
      "petrification": 17,
      "wand": 18,
      "breath": 20,
      "spell": 19
    },
    "classLevels": [],
    "items": [
      "Short Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Caves",
      "Kobold Caves",
      "Kuto's Well"
    ]
  },
  {
    "id": "por_070",
    "name": "LARGE SCORPION",
    "sourceRecord": 70,
    "attributes": {
      "strength": 10,
      "intelligence": 3,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 10,
    "thac0": 15,
    "movement": 9,
    "magicRes": 0,
    "xp": 65,
    "attacks": [
      {
        "count": 2.0,
        "dice": "1d4"
      },
      {
        "count": 1.0,
        "dice": "1d1"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 14,
      "wand": 15,
      "breath": 16,
      "spell": 16
    },
    "classLevels": [
      "Fighter 3"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Poison attack (+2 to save)"
    ],
    "spells": [],
    "areas": [
      "Cadorna Textile House"
    ]
  },
  {
    "id": "por_043",
    "name": "LEVEL 3 MU",
    "sourceRecord": 43,
    "attributes": {
      "strength": 10,
      "intelligence": 15,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 9,
    "hp": 9,
    "thac0": 20,
    "movement": 12,
    "magicRes": 0,
    "xp": 77,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4+2"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 13,
      "wand": 11,
      "breath": 15,
      "spell": 12
    },
    "classLevels": [
      "Mage 3"
    ],
    "items": [
      "Wand of Magic Missiles"
    ],
    "flags": [],
    "effects": [],
    "spells": [
      "m1: Magic missile",
      "m1: Sleep",
      "m2: Stinking cloud"
    ],
    "areas": [
      "Slums"
    ]
  },
  {
    "id": "por_054",
    "name": "LEVEL 3 MU",
    "sourceRecord": 54,
    "attributes": {
      "strength": 10,
      "intelligence": 15,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 9,
    "hp": 9,
    "thac0": 20,
    "movement": 12,
    "magicRes": 0,
    "xp": 77,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4+2"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 13,
      "wand": 11,
      "breath": 15,
      "spell": 12
    },
    "classLevels": [
      "Mage 3"
    ],
    "items": [
      "Wand of Magic Missiles"
    ],
    "flags": [],
    "effects": [],
    "spells": [
      "m1: Magic missile",
      "m1: Sleep",
      "m2: Stinking cloud"
    ],
    "areas": [
      "Civilized Area",
      "Council",
      "Training Hall"
    ]
  },
  {
    "id": "por_165",
    "name": "LEVEL 3 MU",
    "sourceRecord": 165,
    "attributes": {
      "strength": 10,
      "intelligence": 15,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 9,
    "hp": 9,
    "thac0": 20,
    "movement": 12,
    "magicRes": 0,
    "xp": 77,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4+2"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 13,
      "wand": 11,
      "breath": 15,
      "spell": 12
    },
    "classLevels": [
      "Mage 3"
    ],
    "items": [
      "Wand of Magic Missiles"
    ],
    "flags": [],
    "effects": [],
    "spells": [
      "m1: Magic missile",
      "m1: Sleep",
      "m2: Stinking cloud"
    ],
    "areas": []
  },
  {
    "id": "por_106",
    "name": "LEVEL 5 CLERIC",
    "sourceRecord": 106,
    "attributes": {
      "strength": 14,
      "intelligence": 10,
      "wisdom": 18,
      "dexterity": 10,
      "constitution": 14,
      "charisma": 10
    },
    "ac": 10,
    "hp": 29,
    "thac0": 18,
    "movement": 12,
    "magicRes": 0,
    "xp": 275,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4"
      }
    ],
    "saves": {
      "death": 9,
      "petrification": 12,
      "wand": 13,
      "breath": 15,
      "spell": 14
    },
    "classLevels": [
      "Cleric 5"
    ],
    "items": [
      "Mace +3",
      "Necklace of Missiles",
      "Plate Mail +1"
    ],
    "flags": [],
    "effects": [],
    "spells": [
      "c1: Bless (2)",
      "c1: Cure light wounds (3)",
      "c2: Hold person (5)",
      "c3: Cause blindness"
    ],
    "areas": [
      "Valjevo Castle SW"
    ]
  },
  {
    "id": "por_031",
    "name": "LEVEL 6 MU",
    "sourceRecord": 31,
    "attributes": {
      "strength": 10,
      "intelligence": 15,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 9,
    "hp": 23,
    "thac0": 19,
    "movement": 12,
    "magicRes": 0,
    "xp": 288,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4+2"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 11,
      "wand": 9,
      "breath": 13,
      "spell": 10
    },
    "classLevels": [
      "Mage 6"
    ],
    "items": [
      "Ring of Protection +2"
    ],
    "flags": [],
    "effects": [],
    "spells": [
      "m1: Magic missile (2)",
      "m1: Sleep (2)",
      "m2: Mirror image",
      "m2: Stinking cloud",
      "m3: Fireball (2)"
    ],
    "areas": [
      "Stojanow Gate"
    ]
  },
  {
    "id": "por_041",
    "name": "LEVEL 6 MU",
    "sourceRecord": 41,
    "attributes": {
      "strength": 10,
      "intelligence": 15,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 9,
    "hp": 23,
    "thac0": 19,
    "movement": 12,
    "magicRes": 0,
    "xp": 288,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4+2"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 11,
      "wand": 9,
      "breath": 13,
      "spell": 10
    },
    "classLevels": [
      "Mage 6"
    ],
    "items": [
      "Cloak of Displacement",
      "Dagger +2",
      "Magic User Scroll With 3 Spells",
      "Ring of Protection +3",
      "Wand of Lightning"
    ],
    "flags": [],
    "effects": [],
    "spells": [
      "m1: Magic missile (2)",
      "m1: Sleep (2)",
      "m2: Mirror image",
      "m2: Stinking cloud",
      "m3: Fireball (2)"
    ],
    "areas": []
  },
  {
    "id": "por_076",
    "name": "LEVEL 6 MU",
    "sourceRecord": 76,
    "attributes": {
      "strength": 10,
      "intelligence": 15,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 9,
    "hp": 23,
    "thac0": 19,
    "movement": 12,
    "magicRes": 0,
    "xp": 288,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4+2"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 11,
      "wand": 9,
      "breath": 13,
      "spell": 10
    },
    "classLevels": [
      "Mage 6"
    ],
    "items": [
      "Ring of Protection +2"
    ],
    "flags": [],
    "effects": [],
    "spells": [
      "m1: Magic missile (2)",
      "m1: Sleep (2)",
      "m2: Mirror image",
      "m2: Stinking cloud",
      "m3: Fireball (2)"
    ],
    "areas": [
      "Valhingen Graveyard"
    ]
  },
  {
    "id": "por_139",
    "name": "LIZARDMAN",
    "sourceRecord": 139,
    "attributes": {
      "strength": 10,
      "intelligence": 3,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 4,
    "hp": 11,
    "thac0": 16,
    "movement": 6,
    "magicRes": 0,
    "xp": 98,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      },
      {
        "count": 2.0,
        "dice": "1d2"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 14,
      "wand": 15,
      "breath": 16,
      "spell": 16
    },
    "classLevels": [
      "Fighter 3"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Sorcerer's Island (level 2-3)",
      "World Map"
    ]
  },
  {
    "id": "por_159",
    "name": "LIZARDMAN",
    "sourceRecord": 159,
    "attributes": {
      "strength": 10,
      "intelligence": 3,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 4,
    "hp": 11,
    "thac0": 16,
    "movement": 6,
    "magicRes": 0,
    "xp": 98,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      },
      {
        "count": 2.0,
        "dice": "1d2"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 14,
      "wand": 15,
      "breath": 16,
      "spell": 16
    },
    "classLevels": [
      "Fighter 3"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Kuto's Well",
      "Lizard Men Keep"
    ]
  },
  {
    "id": "por_011",
    "name": "MACE",
    "sourceRecord": 11,
    "attributes": {
      "strength": 17,
      "intelligence": 10,
      "wisdom": 17,
      "dexterity": 17,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 10,
    "hp": 25,
    "thac0": 18,
    "movement": 9,
    "magicRes": 0,
    "xp": 215,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d3"
      }
    ],
    "saves": {
      "death": 9,
      "petrification": 12,
      "wand": 13,
      "breath": 15,
      "spell": 14
    },
    "classLevels": [
      "Cleric 5"
    ],
    "items": [
      "Chain Mail",
      "Mace +1",
      "Shield"
    ],
    "flags": [],
    "effects": [],
    "spells": [
      "c1: Bless (2)",
      "c1: Cause light wounds (2)",
      "c1: Curse",
      "c2: Hold person (5)",
      "c3: Animate dead",
      "c3: Prayer"
    ],
    "areas": [
      "Temple of Bane"
    ]
  },
  {
    "id": "por_032",
    "name": "MAD MAN",
    "sourceRecord": 32,
    "attributes": {
      "strength": 17,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 4,
    "hp": 7,
    "thac0": 20,
    "movement": 9,
    "magicRes": 0,
    "xp": 17,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 1"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Mendor's Library"
    ]
  },
  {
    "id": "por_094",
    "name": "MEDUSA",
    "sourceRecord": 94,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 30,
    "thac0": 13,
    "movement": 9,
    "magicRes": 0,
    "xp": 905,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4"
      }
    ],
    "saves": {
      "death": 11,
      "petrification": 12,
      "wand": 13,
      "breath": 13,
      "spell": 14
    },
    "classLevels": [
      "Fighter 6"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Petrifying gaze",
      "Poison attack",
      "Reflectable gaze"
    ],
    "spells": [],
    "areas": [
      "Valjevo Castle, Inner Tower"
    ]
  },
  {
    "id": "por_153",
    "name": "MERCHANT",
    "sourceRecord": 153,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 6,
    "hp": 6,
    "thac0": 19,
    "movement": 12,
    "magicRes": 0,
    "xp": 16,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [],
    "items": [
      "20 x Arrow",
      "Leather Armor",
      "Long Bow",
      "Shield",
      "Short Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_142",
    "name": "MINOTAUR",
    "sourceRecord": 142,
    "attributes": {
      "strength": 18,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 6,
    "hp": 33,
    "thac0": 13,
    "movement": 12,
    "magicRes": 0,
    "xp": 664,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d3"
      },
      {
        "count": 1.0,
        "dice": "2d4"
      }
    ],
    "saves": {
      "death": 11,
      "petrification": 12,
      "wand": 13,
      "breath": 13,
      "spell": 14
    },
    "classLevels": [
      "Fighter 7"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_161",
    "name": "MINOTAUR",
    "sourceRecord": 161,
    "attributes": {
      "strength": 18,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 6,
    "hp": 33,
    "thac0": 13,
    "movement": 12,
    "magicRes": 0,
    "xp": 664,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d3"
      },
      {
        "count": 1.0,
        "dice": "2d4"
      }
    ],
    "saves": {
      "death": 11,
      "petrification": 12,
      "wand": 13,
      "breath": 13,
      "spell": 14
    },
    "classLevels": [
      "Fighter 7"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Caves"
    ]
  },
  {
    "id": "por_089",
    "name": "MUMMY",
    "sourceRecord": 89,
    "attributes": {
      "strength": 18,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 3,
    "hp": 33,
    "thac0": 13,
    "movement": 6,
    "magicRes": 0,
    "xp": 1414,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d12"
      }
    ],
    "saves": {
      "death": 10,
      "petrification": 11,
      "wand": 12,
      "breath": 13,
      "spell": 13
    },
    "classLevels": [
      "Fighter 7, Undead 8"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Disease melee attack",
      "Half damage from magical weapons",
      "Immunity to cold",
      "Immunity to non-magical weapons",
      "Immunity to sleep/charm/paralysis/poison",
      "Mummy fear aura",
      "Vulnerability to fire",
      "Vulnerability to holy water"
    ],
    "spells": [],
    "areas": [
      "Valhingen Graveyard"
    ]
  },
  {
    "id": "por_140",
    "name": "MUTANT LIZ-MAN",
    "sourceRecord": 140,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 3,
    "hp": 18,
    "thac0": 14,
    "movement": 6,
    "magicRes": 0,
    "xp": 132,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d10"
      },
      {
        "count": 2.0,
        "dice": "1d4"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 14,
      "wand": 15,
      "breath": 16,
      "spell": 16
    },
    "classLevels": [
      "Fighter 4"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Sorcerer's Island (level 2-3)",
      "World Map"
    ]
  },
  {
    "id": "por_045",
    "name": "NOMAD",
    "sourceRecord": 45,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 6,
    "hp": 6,
    "thac0": 19,
    "movement": 12,
    "magicRes": 0,
    "xp": 16,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 1"
    ],
    "items": [
      "20 x Arrow",
      "Leather Armor",
      "Long Bow",
      "Shield",
      "Short Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Civilized Area",
      "Training Hall"
    ]
  },
  {
    "id": "por_133",
    "name": "NOMAD",
    "sourceRecord": 133,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 6,
    "hp": 6,
    "thac0": 19,
    "movement": 12,
    "magicRes": 0,
    "xp": 16,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 1"
    ],
    "items": [
      "20 x Arrow",
      "Leather Armor",
      "Long Bow",
      "Shield",
      "Short Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Nomad Camp"
    ]
  },
  {
    "id": "por_158",
    "name": "NORRIS THE GRAY",
    "sourceRecord": 158,
    "attributes": {
      "strength": 17,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 17,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 10,
    "hp": 25,
    "thac0": 15,
    "movement": 9,
    "magicRes": 0,
    "xp": 215,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d3"
      }
    ],
    "saves": {
      "death": 11,
      "petrification": 12,
      "wand": 13,
      "breath": 13,
      "spell": 14
    },
    "classLevels": [
      "Fighter 5"
    ],
    "items": [
      "Chain Mail",
      "Long Sword +1",
      "Shield"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Kuto's Well"
    ]
  },
  {
    "id": "por_008",
    "name": "OGRE LEADER",
    "sourceRecord": 8,
    "attributes": {
      "strength": 18,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 3,
    "hp": 32,
    "thac0": 3,
    "movement": 9,
    "magicRes": 0,
    "xp": 481,
    "attacks": [
      {
        "count": 1.0,
        "dice": "2d6"
      }
    ],
    "saves": {
      "death": 10,
      "petrification": 11,
      "wand": 12,
      "breath": 12,
      "spell": 13
    },
    "classLevels": [
      "Fighter 7"
    ],
    "items": [
      "15 x Arrow",
      "Long Bow"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_007",
    "name": "OGRE",
    "sourceRecord": 7,
    "attributes": {
      "strength": 18,
      "intelligence": 6,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 21,
    "thac0": 15,
    "movement": 9,
    "magicRes": 0,
    "xp": 195,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d10"
      }
    ],
    "saves": {
      "death": 11,
      "petrification": 12,
      "wand": 13,
      "breath": 13,
      "spell": 14
    },
    "classLevels": [
      "Fighter 5"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Podol Plaza",
      "Temple of Bane"
    ]
  },
  {
    "id": "por_024",
    "name": "OGRE",
    "sourceRecord": 24,
    "attributes": {
      "strength": 18,
      "intelligence": 6,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 21,
    "thac0": 15,
    "movement": 9,
    "magicRes": 0,
    "xp": 195,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d10"
      }
    ],
    "saves": {
      "death": 11,
      "petrification": 12,
      "wand": 13,
      "breath": 13,
      "spell": 14
    },
    "classLevels": [
      "Fighter 5"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Slums"
    ]
  },
  {
    "id": "por_068",
    "name": "OGRE",
    "sourceRecord": 68,
    "attributes": {
      "strength": 18,
      "intelligence": 6,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 21,
    "thac0": 15,
    "movement": 9,
    "magicRes": 0,
    "xp": 195,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d10"
      }
    ],
    "saves": {
      "death": 11,
      "petrification": 12,
      "wand": 13,
      "breath": 13,
      "spell": 14
    },
    "classLevels": [
      "Fighter 5"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Cadorna Textile House"
    ]
  },
  {
    "id": "por_004",
    "name": "ORC LEADER",
    "sourceRecord": 4,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 12,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 8,
    "thac0": 16,
    "movement": 6,
    "magicRes": 0,
    "xp": 44,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 1"
    ],
    "items": [
      "7 x Arrow",
      "Battle Axe",
      "Chain Mail",
      "Long Bow"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Podol Plaza",
      "Temple of Bane"
    ]
  },
  {
    "id": "por_021",
    "name": "ORC LEADER",
    "sourceRecord": 21,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 12,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 8,
    "thac0": 16,
    "movement": 6,
    "magicRes": 0,
    "xp": 44,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 1"
    ],
    "items": [
      "7 x Arrow",
      "Battle Axe",
      "Chain Mail",
      "Long Bow"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Slums"
    ]
  },
  {
    "id": "por_028",
    "name": "ORC LEADER",
    "sourceRecord": 28,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 12,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 8,
    "thac0": 16,
    "movement": 6,
    "magicRes": 0,
    "xp": 44,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 1"
    ],
    "items": [
      "7 x Arrow",
      "Broad Sword +1",
      "Chain Mail",
      "Long Bow"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Slums"
    ]
  },
  {
    "id": "por_029",
    "name": "ORC LEADER",
    "sourceRecord": 29,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 12,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 8,
    "thac0": 16,
    "movement": 6,
    "magicRes": 0,
    "xp": 44,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 1"
    ],
    "items": [
      "7 x Arrow",
      "Chain Mail +1",
      "Flail +1",
      "Long Bow"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Slums"
    ]
  },
  {
    "id": "por_065",
    "name": "ORC LEADER",
    "sourceRecord": 65,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 12,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 8,
    "thac0": 16,
    "movement": 6,
    "magicRes": 0,
    "xp": 44,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 1"
    ],
    "items": [
      "7 x Arrow",
      "Battle Axe",
      "Chain Mail",
      "Long Bow"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_003",
    "name": "ORC",
    "sourceRecord": 3,
    "attributes": {
      "strength": 10,
      "intelligence": 6,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 6,
    "hp": 5,
    "thac0": 19,
    "movement": 9,
    "magicRes": 0,
    "xp": 15,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 1"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Podol Plaza",
      "Temple of Bane"
    ]
  },
  {
    "id": "por_013",
    "name": "ORC",
    "sourceRecord": 13,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 6,
    "hp": 5,
    "thac0": 19,
    "movement": 6,
    "magicRes": 0,
    "xp": 15,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 1"
    ],
    "items": [
      "30 x Arrow",
      "Short Bow"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Temple of Bane"
    ]
  },
  {
    "id": "por_020",
    "name": "ORC",
    "sourceRecord": 20,
    "attributes": {
      "strength": 10,
      "intelligence": 6,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 6,
    "hp": 5,
    "thac0": 19,
    "movement": 9,
    "magicRes": 0,
    "xp": 15,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 1"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Slums"
    ]
  },
  {
    "id": "por_027",
    "name": "ORC",
    "sourceRecord": 27,
    "attributes": {
      "strength": 10,
      "intelligence": 6,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 6,
    "hp": 5,
    "thac0": 19,
    "movement": 9,
    "magicRes": 0,
    "xp": 15,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 1"
    ],
    "items": [
      "Clerical Scroll With 2 Spells"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Slums"
    ]
  },
  {
    "id": "por_064",
    "name": "ORC",
    "sourceRecord": 64,
    "attributes": {
      "strength": 10,
      "intelligence": 6,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 6,
    "hp": 5,
    "thac0": 19,
    "movement": 9,
    "magicRes": 0,
    "xp": 15,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 1"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_137",
    "name": "ORC",
    "sourceRecord": 137,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 6,
    "hp": 5,
    "thac0": 19,
    "movement": 6,
    "magicRes": 0,
    "xp": 15,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 1"
    ],
    "items": [
      "30 x Arrow",
      "Short Bow"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_169",
    "name": "PHASE SPIDER",
    "sourceRecord": 169,
    "attributes": {
      "strength": 10,
      "intelligence": 3,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 7,
    "hp": 35,
    "thac0": 13,
    "movement": 6,
    "magicRes": 0,
    "xp": 910,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 11,
      "petrification": 12,
      "wand": 13,
      "breath": 13,
      "spell": 14
    },
    "classLevels": [
      "Cleric 255, Fighter 255, Mage 255, Thief 255"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Blinking",
      "Poison melee attack (-2 to save)"
    ],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_082",
    "name": "POISONOUS FROG",
    "sourceRecord": 82,
    "attributes": {
      "strength": 10,
      "intelligence": 3,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 8,
    "hp": 4,
    "thac0": 19,
    "movement": 9,
    "magicRes": 0,
    "xp": 39,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d1"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 1"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Poison attack (+4 to save)"
    ],
    "spells": [],
    "areas": [
      "Cadorna Textile House"
    ]
  },
  {
    "id": "por_086",
    "name": "PRINCESS FATIMA",
    "sourceRecord": 86,
    "attributes": {
      "strength": 18,
      "intelligence": 14,
      "wisdom": 10,
      "dexterity": 18,
      "constitution": 16,
      "charisma": 15
    },
    "ac": 10,
    "hp": 33,
    "thac0": 18,
    "movement": 12,
    "magicRes": 0,
    "xp": 255,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d3"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 14,
      "wand": 15,
      "breath": 16,
      "spell": 16
    },
    "classLevels": [
      "Fighter 4"
    ],
    "items": [
      "Leather Armor",
      "Shield",
      "Short Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_167",
    "name": "PRINCESS FATIMA",
    "sourceRecord": 167,
    "attributes": {
      "strength": 18,
      "intelligence": 14,
      "wisdom": 10,
      "dexterity": 18,
      "constitution": 16,
      "charisma": 15
    },
    "ac": 10,
    "hp": 33,
    "thac0": 18,
    "movement": 12,
    "magicRes": 0,
    "xp": 255,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d3"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 14,
      "wand": 15,
      "breath": 16,
      "spell": 16
    },
    "classLevels": [
      "Fighter 4"
    ],
    "items": [
      "Leather Armor",
      "Shield",
      "Short Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Kobold Caves"
    ]
  },
  {
    "id": "por_109",
    "name": "QUICKLINGS",
    "sourceRecord": 109,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 18,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 1,
    "hp": 7,
    "thac0": 18,
    "movement": 96,
    "magicRes": 0,
    "xp": 221,
    "attacks": [
      {
        "count": 3.0,
        "dice": "1d4"
      }
    ],
    "saves": {
      "death": 2,
      "petrification": 5,
      "wand": 6,
      "breath": 8,
      "spell": 7
    },
    "classLevels": [
      "Cleric 1, Fighter 1"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_061",
    "name": "ROBBER",
    "sourceRecord": 61,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 18,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 10,
    "hp": 16,
    "thac0": 20,
    "movement": 12,
    "magicRes": 0,
    "xp": 170,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 12,
      "wand": 14,
      "breath": 16,
      "spell": 15
    },
    "classLevels": [
      "Thief 4"
    ],
    "items": [
      "Leather Armor +1",
      "Short Sword +1"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_136",
    "name": "SHAMAN",
    "sourceRecord": 136,
    "attributes": {
      "strength": 10,
      "intelligence": 15,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 9,
    "hp": 20,
    "thac0": 20,
    "movement": 12,
    "magicRes": 0,
    "xp": 190,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4+2"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 13,
      "wand": 11,
      "breath": 15,
      "spell": 12
    },
    "classLevels": [
      "Mage 5"
    ],
    "items": [
      "Bracers AC 2",
      "Dagger +2",
      "Wand of Magic Missiles"
    ],
    "flags": [],
    "effects": [],
    "spells": [
      "m1: Magic missile (2)",
      "m1: Sleep (2)",
      "m2: Mirror image",
      "m2: Stinking cloud",
      "m3: Fireball"
    ],
    "areas": [
      "Nomad Camp"
    ]
  },
  {
    "id": "por_080",
    "name": "SKELETON",
    "sourceRecord": 80,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 7,
    "hp": 5,
    "thac0": 19,
    "movement": 12,
    "magicRes": 0,
    "xp": 19,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 1, Undead 1"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Half damage from piercing/slashing weapons",
      "Immunity to cold",
      "Immunity to sleep/charm/paralysis/poison",
      "Vulnerability to holy water"
    ],
    "spells": [],
    "areas": [
      "Cadorna Textile House",
      "Valhingen Graveyard"
    ]
  },
  {
    "id": "por_077",
    "name": "SKULLCRUSHER",
    "sourceRecord": 77,
    "attributes": {
      "strength": 18,
      "intelligence": 10,
      "wisdom": 8,
      "dexterity": 16,
      "constitution": 18,
      "charisma": 12
    },
    "ac": 10,
    "hp": 39,
    "thac0": 17,
    "movement": 12,
    "magicRes": 0,
    "xp": 216,
    "attacks": [
      {
        "count": 1.0,
        "dice": "2d1+2"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 14,
      "wand": 15,
      "breath": 16,
      "spell": 16
    },
    "classLevels": [
      "Fighter 4"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Cadorna Textile House"
    ]
  },
  {
    "id": "por_030",
    "name": "SPECTRE",
    "sourceRecord": 30,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 2,
    "hp": 38,
    "thac0": 12,
    "movement": 30,
    "magicRes": 0,
    "xp": 2030,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 10,
      "petrification": 11,
      "wand": 12,
      "breath": 12,
      "spell": 13
    },
    "classLevels": [
      "Fighter 8, Undead 9"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Drain 2 levels",
      "Immunity to cold",
      "Immunity to non-magical weapons",
      "Immunity to paralysis (hold person, wand)",
      "Immunity to paralysis/poison",
      "Immunity to sleep/charm",
      "Vulnerability to holy water"
    ],
    "spells": [],
    "areas": [
      "Mendor's Library"
    ]
  },
  {
    "id": "por_069",
    "name": "SPECTRE",
    "sourceRecord": 69,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 2,
    "hp": 38,
    "thac0": 12,
    "movement": 30,
    "magicRes": 0,
    "xp": 2030,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 10,
      "petrification": 11,
      "wand": 12,
      "breath": 12,
      "spell": 13
    },
    "classLevels": [
      "Fighter 8, Undead 9"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Drain 2 levels",
      "Immunity to cold",
      "Immunity to non-magical weapons",
      "Immunity to paralysis (hold person, wand)",
      "Immunity to paralysis/poison",
      "Immunity to sleep/charm",
      "Vulnerability to holy water"
    ],
    "spells": [],
    "areas": [
      "Valhingen Graveyard"
    ]
  },
  {
    "id": "por_141",
    "name": "STIRGE",
    "sourceRecord": 141,
    "attributes": {
      "strength": 10,
      "intelligence": 3,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 8,
    "hp": 5,
    "thac0": 15,
    "movement": 18,
    "magicRes": 0,
    "xp": 46,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d3"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 2"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Blood draining attack"
    ],
    "spells": [],
    "areas": [
      "World Map"
    ]
  },
  {
    "id": "por_044",
    "name": "SWORDSMAN",
    "sourceRecord": 44,
    "attributes": {
      "strength": 16,
      "intelligence": 14,
      "wisdom": 14,
      "dexterity": 14,
      "constitution": 14,
      "charisma": 10
    },
    "ac": 8,
    "hp": 18,
    "thac0": 18,
    "movement": 12,
    "magicRes": 0,
    "xp": 89,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 14,
      "wand": 15,
      "breath": 16,
      "spell": 16
    },
    "classLevels": [
      "Fighter 3"
    ],
    "items": [
      "20 x Arrow",
      "Chain Mail",
      "Long Bow",
      "Long Sword"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_060",
    "name": "THEURGIST",
    "sourceRecord": 60,
    "attributes": {
      "strength": 10,
      "intelligence": 15,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 9,
    "hp": 13,
    "thac0": 20,
    "movement": 12,
    "magicRes": 0,
    "xp": 127,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4+2"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 13,
      "wand": 11,
      "breath": 15,
      "spell": 12
    },
    "classLevels": [
      "Mage 4"
    ],
    "items": [
      "6 x Dart",
      "Dagger",
      "Ring of Protection +1"
    ],
    "flags": [],
    "effects": [],
    "spells": [
      "m1: Read magic",
      "m1: Sleep (2)",
      "m2: Knock",
      "m2: Stinking cloud"
    ],
    "areas": []
  },
  {
    "id": "por_128",
    "name": "THRI-KREEN",
    "sourceRecord": 128,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 33,
    "thac0": 13,
    "movement": 18,
    "magicRes": 0,
    "xp": 1064,
    "attacks": [
      {
        "count": 4.0,
        "dice": "1d4"
      },
      {
        "count": 1.0,
        "dice": "1d4+1"
      }
    ],
    "saves": {
      "death": 10,
      "petrification": 11,
      "wand": 12,
      "breath": 12,
      "spell": 13
    },
    "classLevels": [
      "Fighter 7"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Paralysis melee attack",
      "Thri-kreen missile evasion"
    ],
    "spells": [],
    "areas": [
      "Caves"
    ]
  },
  {
    "id": "por_129",
    "name": "TIGER",
    "sourceRecord": 129,
    "attributes": {
      "strength": 10,
      "intelligence": 3,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 6,
    "hp": 38,
    "thac0": 13,
    "movement": 12,
    "magicRes": 0,
    "xp": 453,
    "attacks": [
      {
        "count": 2.0,
        "dice": "1d4+1"
      },
      {
        "count": 1.0,
        "dice": "1d10"
      }
    ],
    "saves": {
      "death": 11,
      "petrification": 12,
      "wand": 13,
      "breath": 13,
      "spell": 14
    },
    "classLevels": [
      "Fighter 6"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Rear claw rake"
    ],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_034",
    "name": "TROLL",
    "sourceRecord": 34,
    "attributes": {
      "strength": 19,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 4,
    "hp": 36,
    "thac0": 13,
    "movement": 12,
    "magicRes": 0,
    "xp": 813,
    "attacks": [
      {
        "count": 2.0,
        "dice": "1d4+4"
      },
      {
        "count": 1.0,
        "dice": "2d6"
      }
    ],
    "saves": {
      "death": 10,
      "petrification": 11,
      "wand": 12,
      "breath": 12,
      "spell": 13
    },
    "classLevels": [
      "Fighter 7"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Regenerate 3 hit points per round, can return from death in 3d6 rounds",
      "Troll fire/acid vulnerability"
    ],
    "spells": [],
    "areas": [
      "Slums"
    ]
  },
  {
    "id": "por_091",
    "name": "TROLL",
    "sourceRecord": 91,
    "attributes": {
      "strength": 19,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 4,
    "hp": 36,
    "thac0": 13,
    "movement": 12,
    "magicRes": 0,
    "xp": 813,
    "attacks": [
      {
        "count": 2.0,
        "dice": "1d4+4"
      },
      {
        "count": 1.0,
        "dice": "2d6"
      }
    ],
    "saves": {
      "death": 10,
      "petrification": 11,
      "wand": 12,
      "breath": 12,
      "spell": 13
    },
    "classLevels": [
      "Fighter 7"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Regenerate 3 hit points per round, can return from death in 3d6 rounds",
      "Troll fire/acid vulnerability"
    ],
    "spells": [],
    "areas": [
      "Valjevo Castle SE"
    ]
  },
  {
    "id": "por_157",
    "name": "TROLL",
    "sourceRecord": 157,
    "attributes": {
      "strength": 19,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 4,
    "hp": 36,
    "thac0": 13,
    "movement": 12,
    "magicRes": 0,
    "xp": 813,
    "attacks": [
      {
        "count": 2.0,
        "dice": "1d4+4"
      },
      {
        "count": 1.0,
        "dice": "2d6"
      }
    ],
    "saves": {
      "death": 10,
      "petrification": 11,
      "wand": 12,
      "breath": 12,
      "spell": 13
    },
    "classLevels": [
      "Fighter 7"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Regenerate 3 hit points per round, can return from death in 3d6 rounds",
      "Troll fire/acid vulnerability"
    ],
    "spells": [],
    "areas": [
      "Caves",
      "Kobold Caves"
    ]
  },
  {
    "id": "por_098",
    "name": "TYRANITHRAXUS",
    "sourceRecord": 98,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 19,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 0,
    "hp": 80,
    "thac0": 5,
    "movement": 24,
    "magicRes": 0,
    "xp": 3670,
    "attacks": [
      {
        "count": 2.0,
        "dice": "1d6"
      },
      {
        "count": 1.0,
        "dice": "4d6"
      }
    ],
    "saves": {
      "death": 7,
      "petrification": 8,
      "wand": 9,
      "breath": 8,
      "spell": 10
    },
    "classLevels": [
      "Fighter 10"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Breathes electricity",
      "Displaced",
      "Dragon fear aura",
      "Fire touch attack",
      "Resist magic 100%",
      "Sees invisible"
    ],
    "spells": [],
    "areas": [
      "Valjevo Castle, Inner Tower"
    ]
  },
  {
    "id": "por_107",
    "name": "TYRANITHRAXUS",
    "sourceRecord": 107,
    "attributes": {
      "strength": 17,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 18,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 10,
    "hp": 40,
    "thac0": 19,
    "movement": 12,
    "magicRes": 0,
    "xp": 695,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 12,
      "petrification": 11,
      "wand": 12,
      "breath": 15,
      "spell": 13
    },
    "classLevels": [
      "Thief 8"
    ],
    "items": [
      "Gauntlets of Ogre Power",
      "Long Sword +5",
      "Ring of Protection +3"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Valjevo Castle SE"
    ]
  },
  {
    "id": "por_010",
    "name": "VAMPIRE",
    "sourceRecord": 10,
    "attributes": {
      "strength": 18,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 1,
    "hp": 43,
    "thac0": 14,
    "movement": 12,
    "magicRes": 0,
    "xp": 4316,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6+4"
      }
    ],
    "saves": {
      "death": 8,
      "petrification": 9,
      "wand": 10,
      "breath": 9,
      "spell": 11
    },
    "classLevels": [
      "Fighter 9, Undead 10"
    ],
    "items": [
      "Short Bow"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_075",
    "name": "VAMPIRE",
    "sourceRecord": 75,
    "attributes": {
      "strength": 18,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 1,
    "hp": 43,
    "thac0": 14,
    "movement": 12,
    "magicRes": 0,
    "xp": 4316,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6+4"
      }
    ],
    "saves": {
      "death": 8,
      "petrification": 9,
      "wand": 10,
      "breath": 9,
      "spell": 11
    },
    "classLevels": [
      "Fighter 9, Undead 10"
    ],
    "items": [
      "Short Bow"
    ],
    "flags": [],
    "effects": [
      "Charming gaze",
      "Drain 2 levels",
      "Half damage from cold",
      "Half damage from electricity",
      "Immune to gaze attacks",
      "Immune to non-magical weapons",
      "Immunity to non-magical weapons",
      "Immunity to sleep/charm/paralysis/poison",
      "Regenerate 3 hp/round",
      "Vulnerability to holy water"
    ],
    "spells": [],
    "areas": [
      "Valhingen Graveyard"
    ]
  },
  {
    "id": "por_087",
    "name": "VAMPIRE",
    "sourceRecord": 87,
    "attributes": {
      "strength": 18,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 1,
    "hp": 15,
    "thac0": 14,
    "movement": 12,
    "magicRes": 0,
    "xp": 3980,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6+4"
      }
    ],
    "saves": {
      "death": 8,
      "petrification": 9,
      "wand": 10,
      "breath": 9,
      "spell": 11
    },
    "classLevels": [
      "Fighter 9, Undead 10"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Charming gaze",
      "Drain 2 levels",
      "Half damage from cold",
      "Half damage from electricity",
      "Immune to gaze attacks",
      "Immunity to non-magical weapons",
      "Immunity to sleep/charm/paralysis/poison",
      "Regenerate 3 hp/round",
      "Vulnerability to holy water"
    ],
    "spells": [],
    "areas": [
      "Valhingen Graveyard"
    ]
  },
  {
    "id": "por_055",
    "name": "WARRIOR",
    "sourceRecord": 55,
    "attributes": {
      "strength": 16,
      "intelligence": 14,
      "wisdom": 14,
      "dexterity": 14,
      "constitution": 14,
      "charisma": 10
    },
    "ac": 10,
    "hp": 13,
    "thac0": 20,
    "movement": 12,
    "magicRes": 0,
    "xp": 46,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 2"
    ],
    "items": [
      "60 x Arrow",
      "Banded Mail",
      "Long Bow",
      "Shield",
      "Silver Battle Axe"
    ],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_072",
    "name": "WIGHT",
    "sourceRecord": 72,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 5,
    "hp": 23,
    "thac0": 15,
    "movement": 12,
    "magicRes": 0,
    "xp": 655,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4"
      }
    ],
    "saves": {
      "death": 11,
      "petrification": 12,
      "wand": 13,
      "breath": 13,
      "spell": 14
    },
    "classLevels": [
      "Fighter 5, Undead 5"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Drain 1 level",
      "Immunity to cold",
      "Immunity to non-silver/non-magical weapons",
      "Immunity to paralysis (hold person, wand)",
      "Immunity to paralysis/poison",
      "Immunity to sleep/charm",
      "Vulnerability to holy water"
    ],
    "spells": [],
    "areas": [
      "Cadorna Textile House",
      "Valhingen Graveyard"
    ]
  },
  {
    "id": "por_130",
    "name": "WILD BOAR",
    "sourceRecord": 130,
    "attributes": {
      "strength": 10,
      "intelligence": 3,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 7,
    "hp": 18,
    "thac0": 15,
    "movement": 15,
    "magicRes": 0,
    "xp": 157,
    "attacks": [
      {
        "count": 1.0,
        "dice": "3d4"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 14,
      "wand": 15,
      "breath": 16,
      "spell": 16
    },
    "classLevels": [
      "Fighter 4"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Keeps fighting after becoming unconscious"
    ],
    "spells": [],
    "areas": [
      "Caves"
    ]
  },
  {
    "id": "por_170",
    "name": "WILD BOAR",
    "sourceRecord": 170,
    "attributes": {
      "strength": 10,
      "intelligence": 3,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 7,
    "hp": 18,
    "thac0": 15,
    "movement": 15,
    "magicRes": 0,
    "xp": 157,
    "attacks": [
      {
        "count": 1.0,
        "dice": "3d4"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 14,
      "wand": 15,
      "breath": 16,
      "spell": 16
    },
    "classLevels": [
      "Fighter 4"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Keeps fighting after becoming unconscious"
    ],
    "spells": [],
    "areas": [
      "Kobold Caves"
    ]
  },
  {
    "id": "por_056",
    "name": "WOLF",
    "sourceRecord": 56,
    "attributes": {
      "strength": 10,
      "intelligence": 3,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 7,
    "hp": 18,
    "thac0": 16,
    "movement": 18,
    "magicRes": 0,
    "xp": 89,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4+1"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 14,
      "wand": 15,
      "breath": 16,
      "spell": 16
    },
    "classLevels": [
      "Fighter 3"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": []
  },
  {
    "id": "por_088",
    "name": "WOLF",
    "sourceRecord": 88,
    "attributes": {
      "strength": 10,
      "intelligence": 3,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 7,
    "hp": 18,
    "thac0": 16,
    "movement": 18,
    "magicRes": 0,
    "xp": 89,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4+1"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 14,
      "wand": 15,
      "breath": 16,
      "spell": 16
    },
    "classLevels": [
      "Fighter 3"
    ],
    "items": [],
    "flags": [],
    "effects": [],
    "spells": [],
    "areas": [
      "Valhingen Graveyard"
    ]
  },
  {
    "id": "por_073",
    "name": "WRAITH",
    "sourceRecord": 73,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 4,
    "hp": 24,
    "thac0": 15,
    "movement": 24,
    "magicRes": 0,
    "xp": 719,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 11,
      "petrification": 12,
      "wand": 13,
      "breath": 13,
      "spell": 14
    },
    "classLevels": [
      "Fighter 6, Undead 7"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Drain 1 level",
      "Immunity to cold",
      "Immunity to non-silver (half damage) / non-magical wweapons",
      "Immunity to paralysis (hold person, wand)",
      "Immunity to paralysis/poison",
      "Immunity to sleep/charm",
      "Vulnerability to holy water"
    ],
    "spells": [],
    "areas": [
      "Valhingen Graveyard"
    ]
  },
  {
    "id": "por_171",
    "name": "WYVERN",
    "sourceRecord": 171,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 3,
    "hp": 42,
    "thac0": 12,
    "movement": 24,
    "magicRes": 0,
    "xp": 1345,
    "attacks": [
      {
        "count": 1.0,
        "dice": "2d8"
      },
      {
        "count": 1.0,
        "dice": "1d6"
      }
    ],
    "saves": {
      "death": 8,
      "petrification": 9,
      "wand": 10,
      "breath": 9,
      "spell": 11
    },
    "classLevels": [
      "Fighter 9"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Poison attack"
    ],
    "spells": [],
    "areas": [
      "Caves",
      "Kobold Caves"
    ]
  },
  {
    "id": "por_151",
    "name": "YARASH",
    "sourceRecord": 151,
    "attributes": {
      "strength": 10,
      "intelligence": 18,
      "wisdom": 10,
      "dexterity": 10,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 9,
    "hp": 27,
    "thac0": 19,
    "movement": 12,
    "magicRes": 0,
    "xp": 924,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d4+2"
      }
    ],
    "saves": {
      "death": 13,
      "petrification": 11,
      "wand": 9,
      "breath": 13,
      "spell": 10
    },
    "classLevels": [
      "Mage 9"
    ],
    "items": [
      "2 x Potion of Healing",
      "Bracers AC 4",
      "Potion of Speed",
      "Wand of Paralyzation"
    ],
    "flags": [],
    "effects": [],
    "spells": [
      "m1: Magic missile (3)",
      "m1: Shield",
      "m2: Mirror image",
      "m2: Stinking cloud (2)",
      "m3: Blink",
      "m3: Fireball",
      "m3: Protection from normal missiles"
    ],
    "areas": [
      "Sorcerer's Island (level 2-3)"
    ]
  },
  {
    "id": "por_081",
    "name": "ZOMBIE",
    "sourceRecord": 81,
    "attributes": {
      "strength": 10,
      "intelligence": 10,
      "wisdom": 10,
      "dexterity": 0,
      "constitution": 10,
      "charisma": 10
    },
    "ac": 8,
    "hp": 10,
    "thac0": 16,
    "movement": 6,
    "magicRes": 0,
    "xp": 40,
    "attacks": [
      {
        "count": 1.0,
        "dice": "1d8"
      }
    ],
    "saves": {
      "death": 14,
      "petrification": 15,
      "wand": 16,
      "breath": 17,
      "spell": 17
    },
    "classLevels": [
      "Fighter 2, Undead 2"
    ],
    "items": [],
    "flags": [],
    "effects": [
      "Immunity to cold",
      "Immunity to sleep/charm/paralysis/poison",
      "Vulnerability to holy water"
    ],
    "spells": [],
    "areas": [
      "Cadorna Textile House",
      "Valhingen Graveyard"
    ]
  }
];
