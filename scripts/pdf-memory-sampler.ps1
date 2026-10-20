$ErrorActionPreference = 'Stop'
$rootProcessId = [int]$env:VYNLT_BENCH_PID
# Only process IDs, parent IDs and working sets are inspected. No command lines.
for ($sampleNumber = 0; $sampleNumber -lt 240; $sampleNumber++) {
    $rows = @(Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId,WorkingSetSize)
    if (-not ($rows | Where-Object { $_.ProcessId -eq $rootProcessId })) { break }
    $ids = [System.Collections.Generic.HashSet[int]]::new()
    [void]$ids.Add($rootProcessId)
    do {
        $changed = $false
        foreach ($row in $rows) {
            if ($ids.Contains([int]$row.ParentProcessId) -and $ids.Add([int]$row.ProcessId)) { $changed = $true }
        }
    } while ($changed)
    $bytes = [long]0
    $count = 0
    foreach ($row in $rows) {
        if ($ids.Contains([int]$row.ProcessId)) { $bytes += [long]$row.WorkingSetSize; $count++ }
    }
    [Console]::WriteLine((@{ bytes = $bytes; processes = $count } | ConvertTo-Json -Compress))
    Start-Sleep -Milliseconds 250
}
