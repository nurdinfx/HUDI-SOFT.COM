$file = "c:\Users\nour\Documents\HUDI SOFT SYSTEMS\HudiSoftPOS-Installer-v1.0\HudiSoftPOS_v2\Views\FinanceView.xaml"
$lines = Get-Content $file

# Find the start and end of the AMOUNT DataGridTemplateColumn
$startIdx = -1
$endIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'Header="AMOUNT"') { $startIdx = $i }
    if ($startIdx -ge 0 -and $i -gt $startIdx -and $lines[$i] -match '</DataGridTemplateColumn>') {
        $endIdx = $i
        break
    }
}

Write-Host "Found section: lines $startIdx to $endIdx"

$newSection = @(
'                <DataGridTemplateColumn Header="AMOUNT" Width="140">',
'                    <DataGridTemplateColumn.CellTemplate>',
'                        <DataTemplate>',
'                            <TextBlock Text="{Binding Amount, StringFormat=`${0:N2}}" VerticalAlignment="Center">',
'                                <TextBlock.Style>',
'                                    <Style TargetType="TextBlock">',
'                                        <Style.Triggers>',
'                                            <DataTrigger Binding="{Binding Type}" Value="Income">',
'                                                <Setter Property="Foreground" Value="#2E7D32"/>',
'                                            </DataTrigger>',
'                                            <DataTrigger Binding="{Binding Type}" Value="Expense">',
'                                                <Setter Property="Foreground" Value="#C62828"/>',
'                                            </DataTrigger>',
'                                        </Style.Triggers>',
'                                    </Style>',
'                                </TextBlock.Style>',
'                            </TextBlock>',
'                        </DataTemplate>',
'                    </DataGridTemplateColumn.CellTemplate>',
'                </DataGridTemplateColumn>'
)

$newLines = $lines[0..($startIdx-1)] + $newSection + $lines[($endIdx+1)..($lines.Count-1)]
$newLines | Set-Content $file -Encoding UTF8
Write-Host "Done. Total lines: $($newLines.Count)"
