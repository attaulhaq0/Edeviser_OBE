# Generate draft voiceover WAVs per scene using Windows SAPI (offline).
Add-Type -AssemblyName System.Speech
$out = "docs/demo-capture/audio"
New-Item -ItemType Directory -Force -Path $out | Out-Null

$lines = @(
  @{ id = "00-intro"; text = "This is E Deviser. Learning infrastructure that turns everyday teaching into real insight, for students, for teachers, and for entire schools." },
  @{ id = "01-teacher"; text = "Start with the teacher. Every class becomes a live picture. Learning outcomes, the depth of thinking each task demands, and how every student is performing, all updated in real time as work is graded. No more spreadsheets. No more waiting until the final exam to discover a student is falling behind. The insight is here, while there is still time to act." },
  @{ id = "02-tutor"; text = "For the student, an A I Professor is always on hand. It does not just hand over the answer. It coaches them through the problem, step by step, the way a good teacher would. Personal support, available the very moment they get stuck." },
  @{ id = "03-admin"; text = "And for school leaders, all of it rolls up automatically. Every daily action across every classroom becomes a live, accurate picture of how the whole school is performing. Real outcomes, generated as a natural by product of teaching, not weeks of manual reporting." },
  @{ id = "04-outro"; text = "One connected system. Students who stay consistent. Teachers who can finally act in time. And schools that can prove their outcomes with confidence. E Deviser. Built in Qatar, for the way the region learns." }
)

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voices = $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }
$pref = $voices | Where-Object { $_ -match "Zira|David|Mark|Hazel" } | Select-Object -First 1
if ($pref) { $synth.SelectVoice($pref) }
$synth.Rate = 0

foreach ($l in $lines) {
  $path = Join-Path $out ("{0}.wav" -f $l.id)
  $synth.SetOutputToWaveFile($path)
  $synth.Speak($l.text)
  Write-Output ("voiced: {0}" -f $l.id)
}
$synth.SetOutputToNull(); $synth.Dispose()
Write-Output "done"
