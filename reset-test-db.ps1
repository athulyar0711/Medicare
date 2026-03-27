# reset-test-db.ps1
# ─────────────────────────────────────────────────────────────────
#  One-command script to (re)create the medicare_test MySQL database.
#  Run from the project root:
#     .\reset-test-db.ps1
#
#  What it does:
#    1. Runs schema_test.sql → drops & recreates medicare_test
#    2. Seeds test users, hospitals, doctors, appointments, etc.
# ─────────────────────────────────────────────────────────────────

$DB_USER = "root"
$DB_PASS = "2411"        # same as your .env password
$SQL_FILE = ".\database\schema_test.sql"

Write-Host "⏳  Resetting medicare_test database..." -ForegroundColor Cyan

# Check if mysql is on PATH
if (-not (Get-Command mysql -ErrorAction SilentlyContinue)) {
    Write-Host "❌  'mysql' not found on PATH." -ForegroundColor Red
    Write-Host "    Add MySQL\bin to your system PATH and try again." -ForegroundColor Yellow
    exit 1
}

# Run the SQL file
$result = mysql -u $DB_USER -p"$DB_PASS" --execute "source $SQL_FILE" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅  medicare_test database created and seeded successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Test credentials (all passwords: TestPass1!):" -ForegroundColor White
    Write-Host "    Patient : alice@medicare.test" -ForegroundColor Gray
    Write-Host "    Patient2: bob@medicare.test"   -ForegroundColor Gray
    Write-Host "    Doctor  : rahul@medicare.test" -ForegroundColor Gray
    Write-Host "    Admin   : admin@medicare.test" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Now run:  npm test" -ForegroundColor Cyan
} else {
    Write-Host "❌  MySQL command failed:" -ForegroundColor Red
    Write-Host $result
    exit 1
}
