Option Explicit

Dim objFSO, objShell, strScriptDir, strRoot, strDomain
Dim strLogRoot, strInvokeLog, strLogMain, strLogNode, strLogCaddy
Dim strCaddyBin, strNodeExe, strCommand

Set objFSO = CreateObject("Scripting.FileSystemObject")
Set objShell = CreateObject("WScript.Shell")

' 1. Setup Directories and Variables
strScriptDir = objFSO.GetParentFolderName(WScript.ScriptFullName)
strRoot = objFSO.GetAbsolutePathName(strScriptDir & "\..")
strDomain = "claude-cert.linkpc.net"

' Updated to target the "logs" folder inside your script's current directory
strLogRoot = strScriptDir & "\logs"
strInvokeLog = strLogRoot & "\start-public-hidden-invoke.log"
strLogMain = strLogRoot & "\start-public-hidden.log"
strLogNode = strLogRoot & "\start-public-hidden-node.log"
strLogCaddy = strLogRoot & "\start-public-hidden-caddy.log"

' Double check / create the logs directory if it doesn't exist
If Not objFSO.FolderExists(strLogRoot) Then
    objFSO.CreateFolder(strLogRoot)
End If

' 2. Log Invocation
AppendToLog strInvokeLog, "Invoke: " & Now & vbCrLf & _
                         "Called from: " & objShell.CurrentDirectory & vbCrLf & _
                         "----"

' Start Main Log
WriteToLog strLogMain, "=== Start run: " & Now & vbCrLf & _
                      "Root: " & strRoot & vbCrLf & _
                      "Domain: " & strDomain

' 3. Stop Existing Processes (Hidden)
strCommand = "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command """ & _
             "Get-CimInstance Win32_Process | Where-Object { " & _
             "($_.Name -eq 'node.exe' -and ($_.CommandLine -like '*server.js*' -or $_.CommandLine -like '*Claude Certs*')) " & _
             "-or ($_.Name -eq 'caddy.exe' -and $_.CommandLine -like '*Caddyfile*') " & _
             "} | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"""
objShell.Run strCommand, 0, True
WScript.Sleep 2000

' 4. Configure Caddyfile
Dim objCaddyfile
On Error Resume Next
Set objCaddyfile = objFSO.CreateTextFile(strRoot & "\infra\Caddyfile", True)
If Err.Number <> 0 Then
    AppendToLog strLogMain, "ERROR: Could not create Caddyfile."
    WScript.Quit 1
End If
On Error GoTo 0
objCaddyfile.WriteLine strDomain & " {"
objCaddyfile.WriteLine "  reverse_proxy localhost:8000"
objCaddyfile.WriteLine "}"
objCaddyfile.Close

' 5. Verify Caddy Binary
strCaddyBin = strRoot & "\infra\caddy.exe"
If Not objFSO.FileExists(strCaddyBin) Then
    AppendToLog strLogMain, "ERROR: Caddy not found at " & strCaddyBin
    WScript.Quit 1
End If
AppendToLog strLogMain, "Caddy binary found."

' 6. Locate Node.exe
strNodeExe = FindNodeExe()
If strNodeExe = "" Then
    AppendToLog strLogMain, "ERROR: node.exe not found"
    WScript.Quit 1
End If

' 7. Start Node Server (Hidden)
strCommand = "cmd /c """"" & strNodeExe & """ """ & strRoot & "\app\server.js"" > """ & strLogNode & """ 2>&1"""
objShell.Run strCommand, 0, False
WScript.Sleep 2000

' 8. Start Caddy (Hidden)
strCommand = "cmd /c """"" & strCaddyBin & """ run --config """ & strRoot & "\infra\Caddyfile"" > """ & strLogCaddy & """ 2>&1"""
objShell.Run strCommand, 0, False
WScript.Sleep 2000

' 9. Save Hidden PIDs JSON (Hidden) - Saves JSON inside the standard project scripts folder
strCommand = "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command """ & _
             "$root = '" & strRoot & "'; " & _
             "$nodePids = Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and ($_.CommandLine -like '*server.js*' -or $_.CommandLine -like '*Claude Certs*') } | Select-Object -First 1 -ExpandProperty ProcessId; " & _
             "$caddyPids = Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'caddy.exe' -and $_.CommandLine -like '*Caddyfile*' } | Select-Object -First 1 -ExpandProperty ProcessId; " & _
             "$pids = @{}; " & _
             "if ($nodePids) { $pids.node = $nodePids }; " & _
             "if ($caddyPids) { $pids.caddy = $caddyPids }; " & _
             "if ($pids.Count -gt 0) { $pids | ConvertTo-Json | Set-Content -Path (Join-Path $root 'scripts\logs\hidden_pids.json') -Encoding UTF8 -Force };"""
objShell.Run strCommand, 0, True

WScript.Quit 0

' --- Helper Functions ---

Sub WriteToLog(strFilePath, strText)
    Dim objFile
    Set objFile = objFSO.CreateTextFile(strFilePath, True)
    objFile.WriteLine strText
    objFile.Close
End Sub

Sub AppendToLog(strFilePath, strText)
    Dim objFile
    On Error Resume Next
    Set objFile = objFSO.OpenTextFile(strFilePath, 8, True)
    objFile.WriteLine strText
    objFile.Close
    On Error GoTo 0
End Sub

Function FindNodeExe()
    Dim envProgramFiles, envLocalAppData, envProgramFilesx86
    
    On Error Resume Next
    Dim objExec, strWhere
    Set objExec = objShell.Exec("cmd /c where node.exe")
    strWhere = Trim(objExec.StdOut.ReadAll)
    If InStr(strWhere, "node.exe") > 0 Then
        FindNodeExe = Split(strWhere, vbCrLf)(0)
        Exit Function
    End If
    On Error GoTo 0

    envProgramFiles = objShell.ExpandEnvironmentStrings("%ProgramFiles%")
    envLocalAppData = objShell.ExpandEnvironmentStrings("%LocalAppData%")
    envProgramFilesx86 = objShell.ExpandEnvironmentStrings("%ProgramFiles(x86)%")

    If objFSO.FileExists(envProgramFiles & "\nodejs\node.exe") Then
        FindNodeExe = envProgramFiles & "\nodejs\node.exe"
    ElseIf objFSO.FileExists(envLocalAppData & "\Programs\nodejs\node.exe") Then
        FindNodeExe = envLocalAppData & "\Programs\nodejs\node.exe"
    ElseIf objFSO.FileExists(envProgramFilesx86 & "\nodejs\node.exe") Then
        FindNodeExe = envProgramFilesx86 & "\nodejs\node.exe"
    Else
        FindNodeExe = ""
    End If
End Function
