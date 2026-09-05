<?php

echo "=========================================================\n";
echo "🇳🇬 Nigeria Location & Polling Unit MySQL → JSON Exporter\n";
echo "=========================================================\n\n";

try {
    $pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=nigeria_polling_units;charset=utf8mb4', 'root', '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    echo "✅ Connected to local MySQL (nigeria_polling_units) successfully.\n";
} catch (Exception $e) {
    echo "❌ Failed to connect to local MySQL: " . $e->getMessage() . "\n";
    exit(1);
}

// 1. Fetch States (All 37 States)
echo "\n➡️  Step 1: Fetching all States from 'states' table...\n";
$stmt = $pdo->query("SELECT id, code, name FROM states ORDER BY CAST(code AS UNSIGNED) ASC");
$states = [];
while ($row = $stmt->fetch()) {
    $cleanCode = (string)(int)$row['code'];
    $states[] = [
        'code' => $cleanCode,
        'name' => strtoupper(trim($row['name']))
    ];
}
echo "✅ Fetched " . count($states) . " States.\n";

// 2. Fetch LGAs (All 774 LGAs joined with states to ensure 100% accurate state code)
echo "\n➡️  Step 2: Fetching all LGAs joined with State codes...\n";
$stmt = $pdo->query("
    SELECT l.id, l.name, l.abbreviation, s.code as state_code 
    FROM lgas l 
    JOIN states s ON l.state_id = s.id 
    ORDER BY l.name ASC
");
$lgas = [];
$lgaMap = [];
while ($row = $stmt->fetch()) {
    $stateCode = (string)(int)$row['state_code'];
    $abbr = str_pad(trim($row['abbreviation']), 2, '0', STR_PAD_LEFT);
    $lgaId = "lga-{$stateCode}-{$abbr}";

    $lgaItem = [
        'id' => $lgaId,
        'code' => $abbr,
        'name' => strtoupper(trim($row['name'])),
        'stateId' => $stateCode
    ];

    $lgas[] = $lgaItem;
    $lgaMap["{$stateCode}-{$abbr}"] = $lgaId;
}
echo "✅ Fetched " . count($lgas) . " LGAs across all 37 States.\n";

// 3. Fetch Polling Units for each LGA across Nigeria
echo "\n➡️  Step 3: Fetching Polling Units for each State and LGA...\n";

// Agricultural focus states for One Acre Fund in Nigeria:
// Nasarawa (25), Niger (26), Kano (19), Kaduna (18), Benue (7), Plateau (31), Oyo (30), etc.
$focusStates = ['7', '18', '19', '20', '25', '26', '30', '31', '5', '34', '33', '21', '36'];

$stmt = $pdo->query("
    SELECT id, name, delimitation, abbreviation, state, lga 
    FROM polling_units 
    WHERE delimitation IS NOT NULL AND delimitation != ''
    ORDER BY id ASC
");

$puCountByLga = [];
$pollingUnits = [];
$seenDelimitations = [];

while ($row = $stmt->fetch()) {
    $delim = trim((string)$row['delimitation']);
    if (empty($delim) || isset($seenDelimitations[$delim])) {
        continue;
    }

    $stateCode = (string)(int)$row['state'];
    $lgaCode = str_pad(trim((string)$row['lga']), 2, '0', STR_PAD_LEFT);
    $lgaKey = "{$stateCode}-{$lgaCode}";

    // Must map to a valid LGA in our system
    if (!isset($lgaMap[$lgaKey])) {
        continue;
    }
    $lgaId = $lgaMap[$lgaKey];

    // Set per-LGA density: 25 for focus farming states, 10 for all other LGAs
    $limit = in_array($stateCode, $focusStates) ? 25 : 10;

    $currentCount = $puCountByLga[$lgaId] ?? 0;
    if ($currentCount >= $limit) {
        continue;
    }

    $puCountByLga[$lgaId] = $currentCount + 1;
    $seenDelimitations[$delim] = true;

    $puCode = str_pad(trim((string)($row['abbreviation'] ?? '001')), 3, '0', STR_PAD_LEFT);

    $pollingUnits[] = [
        'id' => "pu-" . $row['id'],
        'code' => $puCode,
        'name' => strtoupper(trim($row['name'])),
        'delimitation' => $delim,
        'lgaId' => $lgaId,
        'stateId' => $stateCode
    ];
}

echo "✅ Fetched " . count($pollingUnits) . " Polling Units.\n";
echo "   - Covering " . count($puCountByLga) . " / " . count($lgas) . " LGAs in Nigeria.\n";

// 4. Save to JSON archive
$dataDir = __DIR__ . '/../data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0777, true);
}

$outputFile = $dataDir . '/nigeria-locations.json';
$package = [
    'metadata' => [
        'generatedAt' => date('c'),
        'source' => 'Local MySQL Database (nigeria_polling_units)',
        'totalStates' => count($states),
        'totalLgas' => count($lgas),
        'totalPollingUnits' => count($pollingUnits),
        'lgasCovered' => count($puCountByLga)
    ],
    'states' => $states,
    'lgas' => $lgas,
    'pollingUnits' => $pollingUnits
];

file_put_contents($outputFile, json_encode($package, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
$fileSizeKb = round(filesize($outputFile) / 1024, 2);

echo "\n💾 Step 4: Successfully saved offline JSON archive!";
echo "\n   - File: $outputFile";
echo "\n   - Size: {$fileSizeKb} KB";
echo "\n   - States: " . count($states);
echo "\n   - LGAs: " . count($lgas);
echo "\n   - Polling Units: " . count($pollingUnits);
echo "\n\n🎉 Export finished successfully! Ready to seed into Neon DB.\n";
