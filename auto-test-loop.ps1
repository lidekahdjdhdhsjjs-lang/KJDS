chcp 65001 | Out-Null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = $ScriptDir
$BackendDir = Join-Path $ScriptDir "backend"
$FrontendDir = Join-Path $ScriptDir "frontend"
$PythonExe = Join-Path $BackendDir "venv_win\Scripts\python.exe"
$LogFile = Join-Path $env:TEMP "shopee-ai-ops-auto-test.log"
$IntervalMinutes = 5

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $Message"
    Write-Host $line
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
}

function Test-BackendAPI {
    Write-Log "=== Testing Backend API ==="
    $endpoints = @(
        @{Url="/"; Name="Root"},
        @{Url="/health"; Name="Health"},
        @{Url="/api/v1/batches"; Name="Batches"},
        @{Url="/api/v1/opportunities"; Name="Opportunities"},
        @{Url="/api/v1/publish-tasks"; Name="PublishTasks"},
        @{Url="/api/v1/procurement-drafts"; Name="ProcurementDrafts"},
        @{Url="/api/v1/agent-runs"; Name="AgentRuns"},
        @{Url="/api/v1/incidents"; Name="Incidents"},
        @{Url="/api/v1/store-health"; Name="StoreHealth"},
        @{Url="/api/v1/training-packages"; Name="TrainingPackages"},
        @{Url="/api/v1/feedback-records"; Name="FeedbackRecords"}
    )
    $passed = 0
    $failed = 0
    foreach ($ep in $endpoints) {
        try {
            $r = Invoke-WebRequest -Uri "http://localhost:8000$($ep.Url)" -Method GET -UseBasicParsing -TimeoutSec 10
            Write-Log "  OK: $($ep.Name) => $($r.StatusCode)"
            $passed++
        } catch {
            $code = $_.Exception.Response.StatusCode.value__
            Write-Log "  FAIL: $($ep.Name) => $code"
            $failed++
        }
    }
    Write-Log "  Backend API: $passed passed, $failed failed"
    return @{Passed=$passed; Failed=$failed}
}

function Test-BackendUnit {
    Write-Log "=== Testing Backend Unit Tests ==="
    try {
        $saved = Get-Location
        Set-Location $BackendDir
        $result = & $PythonExe -m pytest tests/ -v --tb=short 2>&1 | Select-Object -Last 5
        $lastLine = $result | Where-Object { $_ -match "passed" } | Select-Object -Last 1
        Write-Log "  $lastLine"
        Set-Location $saved
        return $true
    } catch {
        Write-Log "  Backend unit tests FAILED: $_"
        Set-Location $saved
        return $false
    }
}

function Test-FrontendUnit {
    Write-Log "=== Testing Frontend Unit Tests ==="
    try {
        $saved = Get-Location
        Set-Location $FrontendDir
        $result = npm test 2>&1 | Select-Object -Last 5
        $lastLine = $result | Where-Object { $_ -match "passed|failed" } | Select-Object -Last 1
        Write-Log "  $lastLine"
        Set-Location $saved
        return $true
    } catch {
        Write-Log "  Frontend unit tests FAILED: $_"
        Set-Location $saved
        return $false
    }
}

function Test-ServicesRunning {
    Write-Log "=== Checking Services ==="
    $backendOk = $false
    $frontendOk = $false
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:8000/health" -Method GET -UseBasicParsing -TimeoutSec 5
        $backendOk = $r.StatusCode -eq 200
    } catch {}
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -UseBasicParsing -TimeoutSec 5
        $frontendOk = $r.StatusCode -eq 200
    } catch {}
    Write-Log "  Backend (port 8000): $(if($backendOk){'RUNNING'}else{'DOWN'})"
    Write-Log "  Frontend (port 3000): $(if($frontendOk){'RUNNING'}else{'DOWN'})"
    return @{Backend=$backendOk; Frontend=$frontendOk}
}

Write-Log "========================================"
Write-Log "Auto-Test Loop Started"
Write-Log "Project: $ProjectDir"
Write-Log "Backend: $BackendDir"
Write-Log "Frontend: $FrontendDir"
Write-Log "Python: $PythonExe"
Write-Log "Interval: $IntervalMinutes minutes"
Write-Log "========================================"

$iteration = 0
while ($true) {
    $iteration++
    Write-Log ""
    Write-Log "====== Iteration #$iteration ======"

    $services = Test-ServicesRunning
    if (-not $services.Backend) {
        Write-Log "WARNING: Backend is down, attempting restart..."
        Start-Process -FilePath $PythonExe -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000" -WorkingDirectory $BackendDir -NoNewWindow
        Start-Sleep -Seconds 5
    }

    Test-BackendAPI | Out-Null
    Test-BackendUnit | Out-Null
    Test-FrontendUnit | Out-Null

    Write-Log "====== Iteration #$iteration Complete ======"
    Write-Log "Next run in $IntervalMinutes minutes..."
    Start-Sleep -Seconds ($IntervalMinutes * 60)
}
