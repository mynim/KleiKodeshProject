using KleiKodesh.Helpers;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;

namespace KleiKodesh.Ribbon
{
    public partial class RibbonSettingsView : UserControl
    {
        private readonly Microsoft.Office.Core.IRibbonUI _ribbon;

        public RibbonSettingsView(Microsoft.Office.Core.IRibbonUI ribbon)
        {
            InitializeComponent();
            _ribbon = ribbon;
            ApplyTexts();
            InitializeControls();
            InitializeLanguage();
            InitializeMacros();
            InitializeShortcuts();
        }

        // ── VBA macros template ──────────────────────────────────────────────────

        private void InitializeMacros()
        {
            string installed = VbaMacrosTemplate.Installed;
            MacrosNoneRadio.IsChecked    = installed == null;
            MacrosHebrewRadio.IsChecked  = installed == VbaMacrosTemplate.Hebrew;
            MacrosEnglishRadio.IsChecked = installed == VbaMacrosTemplate.English;
            MacrosNoneRadio.Checked    += (_, __) => InstallMacros(null);
            MacrosHebrewRadio.Checked  += (_, __) => InstallMacros(VbaMacrosTemplate.Hebrew);
            MacrosEnglishRadio.Checked += (_, __) => InstallMacros(VbaMacrosTemplate.English);
        }

        // Word holds a loaded STARTUP template open, so unload ours before replacing or
        // removing it. The new one loads on Word's next start - say so.
        private void InstallMacros(string lang)
        {
            bool english = AddinUiLanguage.IsEnglish;
            try
            {
                // A keyboard shortcut is stored as the NAME of the macro it runs, so
                // replacing or removing the template would leave bindings aimed at a
                // macro that is no longer there. Take ours out while it is still
                // loaded; the recorded choices survive, and WordShortcuts.ReapplyAll
                // puts them back on the next Word start.
                WordShortcuts.ClearAllBindings();

                foreach (Microsoft.Office.Interop.Word.AddIn addIn in Globals.ThisAddIn.Application.AddIns)
                    if (addIn.Name.StartsWith("KleiKodeshMacros", System.StringComparison.OrdinalIgnoreCase))
                        addIn.Delete();

                VbaMacrosTemplate.Install(lang, System.IO.Path.Combine(System.AppDomain.CurrentDomain.BaseDirectory, "Resources"));
                ShowMessage(VbaMacrosTemplate.ReopenWordText(english), MessageBoxImage.Information);
            }
            catch (System.Exception ex)
            {
                ShowMessage(VbaMacrosTemplate.FailedText(english) + "\n" + ex.Message, MessageBoxImage.Error);
            }
            RefreshShortcuts();
        }

        private static void ShowMessage(string text, MessageBoxImage icon) =>
            MessageBox.Show(text, AddinText.Label("Settings"), MessageBoxButton.OK, icon, MessageBoxResult.OK,
                AddinUiLanguage.IsEnglish ? MessageBoxOptions.None : MessageBoxOptions.RtlReading | MessageBoxOptions.RightAlign);

        // ── Word-level keyboard shortcuts (Helpers\WordShortcuts.cs) ─────────────

        // Each command's combination button, so a row can be relabelled after a change.
        private readonly Dictionary<string, Button> _shortcutButtons = new Dictionary<string, Button>();

        // The command whose row is waiting for a key press, or null.
        private string _capturingId;

        private void InitializeShortcuts()
        {
            // One install path, not two: go through the macros radio that already owns it.
            BtnShortcutsInstall.Click += (_, __) =>
            {
                if (AddinUiLanguage.IsEnglish) MacrosEnglishRadio.IsChecked = true;
                else MacrosHebrewRadio.IsChecked = true;
            };
            BuildShortcutRows();
        }

        // Rebuilt rather than relabelled when the language changes, because the rows
        // themselves are built from WordShortcuts.CommandIds.
        private void BuildShortcutRows()
        {
            ShortcutsPanel.Children.Clear();
            _shortcutButtons.Clear();

            foreach (string id in WordShortcuts.CommandIds)
            {
                string commandId = id;
                var row = new Grid { Margin = new Thickness(0, 0, 0, 4) };
                row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
                row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(132) });
                row.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

                var label = new TextBlock
                {
                    Text = AddinText.Label(commandId),
                    VerticalAlignment = VerticalAlignment.Center,
                    TextTrimming = TextTrimming.CharacterEllipsis,
                    Margin = new Thickness(0, 0, 8, 0),
                };
                Grid.SetColumn(label, 0);

                var capture = new Button { Margin = new Thickness(0, 0, 6, 0) };
                capture.Click += (_, __) => BeginCapture(commandId);
                capture.PreviewKeyDown += ShortcutKeyDown;
                capture.LostKeyboardFocus += (_, __) => { if (_capturingId == commandId) EndCapture(); };
                Grid.SetColumn(capture, 1);

                var clear = new Button { Content = AddinUiLanguage.T("נקה", "Clear"), MinWidth = 54 };
                clear.Click += (_, __) => ClearShortcut(commandId);
                Grid.SetColumn(clear, 2);

                row.Children.Add(label);
                row.Children.Add(capture);
                row.Children.Add(clear);
                ShortcutsPanel.Children.Add(row);
                _shortcutButtons[commandId] = capture;
            }

            RefreshShortcuts();
        }

        // Shows what Word actually holds. Before Word has loaded the template there is
        // nothing to read, so the recorded choice is shown and the rows are disabled -
        // Word refuses to bind a macro it cannot resolve, so there is nothing to offer.
        private void RefreshShortcuts()
        {
            bool ready = WordShortcuts.IsReady;
            Dictionary<string, int> live = ready ? WordShortcuts.Current() : null;

            foreach (var pair in _shortcutButtons)
            {
                int code = live != null && live.TryGetValue(pair.Key, out int bound)
                    ? bound
                    : WordShortcuts.Recorded(pair.Key);
                pair.Value.Content = WordShortcuts.Describe(code) ?? AddinUiLanguage.T("ללא", "None");
            }

            foreach (UIElement row in ShortcutsPanel.Children)
                row.IsEnabled = ready;

            if (VbaMacrosTemplate.Installed == null)
            {
                ShortcutsState.Text = AddinUiLanguage.T(
                    "קיצורי המקשים עובדים דרך תבנית המאקרו של התוסף, שאיננה מותקנת כרגע. התקן אותה כאן, והפעל מחדש את Word.",
                    "The shortcuts work through the add-in's macros template, which is not installed. Install it here and restart Word.");
                BtnShortcutsInstall.Visibility = Visibility.Visible;
            }
            else
            {
                BtnShortcutsInstall.Visibility = Visibility.Collapsed;
                ShortcutsState.Text = ready
                    ? AddinUiLanguage.T("לחץ על השילוב שליד הפקודה, והקש את השילוב הרצוי.",
                                        "Click the combination next to a command, then press the keys you want.")
                    : AddinUiLanguage.T("תבנית המאקרו מותקנת, אך Word עדיין לא טען אותה. יש להפעיל מחדש את Word כדי להקצות קיצורים.",
                                        "The macros template is installed but Word has not loaded it yet. Restart Word to assign shortcuts.");
            }
        }

        private void BeginCapture(string commandId)
        {
            _capturingId = commandId;
            Button button = _shortcutButtons[commandId];
            button.Content = AddinUiLanguage.T("הקש שילוב...", "Press keys...");
            Keyboard.Focus(button);
        }

        private void EndCapture()
        {
            _capturingId = null;
            RefreshShortcuts();
        }

        // Word wants a key code that is a plain sum of modifier bits and a virtual-key
        // code, so the press is read here and handed over as a number.
        private void ShortcutKeyDown(object sender, KeyEventArgs e)
        {
            string commandId = _capturingId;
            if (commandId == null) return;

            // An Alt combination arrives as Key.System, with the real key in SystemKey.
            Key key = e.Key == Key.System ? e.SystemKey : e.Key;
            if (IsModifierKey(key)) return;           // the modifier alone: keep waiting
            e.Handled = true;

            if (key == Key.Escape) { EndCapture(); return; }

            ModifierKeys modifiers = Keyboard.Modifiers;
            bool ctrl  = (modifiers & ModifierKeys.Control) != 0;
            bool shift = (modifiers & ModifierKeys.Shift) != 0;
            bool alt   = (modifiers & ModifierKeys.Alt) != 0;
            int virtualKey = KeyInterop.VirtualKeyFromKey(key);

            if (!WordShortcuts.IsUsable(virtualKey, ctrl, shift, alt))
            {
                ShowMessage(AddinUiLanguage.T(
                    "יש להקיש Ctrl או Alt יחד עם אות, ספרה או F1 עד F12.",
                    "Hold Ctrl or Alt together with a letter, a digit or F1 to F12."), MessageBoxImage.Warning);
                EndCapture();
                return;
            }

            int keyCode = WordShortcuts.KeyCode(virtualKey, ctrl, shift, alt);
            ShortcutHolder holder = WordShortcuts.Holder(keyCode);
            if (holder != null && holder.CommandId != commandId)
            {
                ShowMessage(ConflictText(keyCode, holder), MessageBoxImage.Warning);
                EndCapture();
                return;
            }

            try
            {
                WordShortcuts.Assign(commandId, keyCode);
            }
            catch (Exception ex)
            {
                ShowMessage(AddinUiLanguage.T("Word לא קיבל את השילוב הזה:", "Word did not accept that combination:")
                            + "\n" + ex.Message, MessageBoxImage.Error);
            }
            EndCapture();
        }

        // Never take a combination away from Word or from another add-in in silence.
        private static string ConflictText(int keyCode, ShortcutHolder holder)
        {
            string combination = WordShortcuts.Describe(keyCode);
            if (holder.IsUnknown)
                return AddinUiLanguage.T(
                    $"לא ניתן לבדוק אם {combination} פנוי, ולכן הוא לא הוקצה.",
                    $"Could not check whether {combination} is free, so it was not assigned.");
            if (holder.CommandId != null)
                return AddinUiLanguage.T(
                    $"{combination} מוקצה כבר לפקודה \"{AddinText.Label(holder.CommandId)}\" של כלי קודש.",
                    $"{combination} is already assigned to the Klei Kodesh command \"{AddinText.Label(holder.CommandId)}\".");
            if (holder.IsBuiltInCommand)
                return AddinUiLanguage.T(
                    $"{combination} שמור לפקודה של Word עצמו ({holder.Command}). בחר שילוב אחר.",
                    $"{combination} is taken by a built-in Word command ({holder.Command}). Choose another combination.");
            return AddinUiLanguage.T(
                $"{combination} תפוס כבר ({holder.Command}) - ייתכן שעל ידי תוסף אחר. בחר שילוב אחר.",
                $"{combination} is already taken ({holder.Command}) - possibly by another add-in. Choose another combination.");
        }

        private static bool IsModifierKey(Key key) =>
            key == Key.LeftCtrl || key == Key.RightCtrl
            || key == Key.LeftShift || key == Key.RightShift
            || key == Key.LeftAlt || key == Key.RightAlt
            || key == Key.System || key == Key.LWin || key == Key.RWin;

        private void ClearShortcut(string commandId)
        {
            try { WordShortcuts.Clear(commandId); }
            catch (Exception ex) { ShowMessage(ex.Message, MessageBoxImage.Error); }
            RefreshShortcuts();
        }

        // Texts follow General/UiLanguage; component names come from AddinText so they
        // match the ribbon. The checkbox for DocDesign is historically named KleiKodesh_*.
        private void ApplyTexts()
        {
            FlowDirection = AddinUiLanguage.FlowDirection;
            VisibleHeader.Text  = AddinUiLanguage.T("רכיבים זמינים", "Available components");
            OptionsHeader.Text  = AddinUiLanguage.T("לחצן ראשי", "Main button");
            LanguageHeader.Text = AddinUiLanguage.T("שפת ממשק", "Interface language");
            LanguageHint.Text   = AddinUiLanguage.T("ייתכן שחלק מההגדרות יחולו רק לאחר הפעלה מחדש של Word.",
                                                    "Some settings may only take effect after Word is restarted.");
            ChkTurnOffUpdates.Content = AddinUiLanguage.T("כבה בדיקת עדכונים אוטומטית", "Turn off automatic update checks");
            BtnReset.Content          = AddinUiLanguage.T("איפוס התוכנה", "Reset the add-in");

            bool english = AddinUiLanguage.IsEnglish;
            MacrosHeader.Text          = VbaMacrosTemplate.HeaderText(english);
            MacrosNoneRadio.Content    = VbaMacrosTemplate.NoneText(english);
            MacrosHebrewRadio.Content  = VbaMacrosTemplate.HebrewNamesText(english);
            MacrosEnglishRadio.Content = VbaMacrosTemplate.EnglishNamesText(english);
            MacrosHint.Text            = VbaMacrosTemplate.HintText(english);

            ShortcutsHeader.Text       = AddinUiLanguage.T("קיצורי מקשים בוורד", "Keyboard shortcuts in Word");
            BtnShortcutsInstall.Content = AddinUiLanguage.T("התקן את תבנית המאקרו", "Install the macros template");
            ShortcutsHint.Text         = AddinUiLanguage.T(
                "השילוב פועל מתוך מסמך Word, ונשמר בתבנית המאקרו - כך שהוא נשאר גם לאחר הפעלה מחדש. "
                + "שילוב שתפוס כבר על ידי Word או על ידי תוסף אחר לא ייגזל: תקבל הודעה. "
                + "Esc מבטל הקשה.",
                "The combination works from inside a Word document and is kept in the macros template, so it "
                + "survives a restart. A combination already taken by Word or by another add-in is not stolen - "
                + "you get a message instead. Esc cancels.");

            foreach (var cb in VisibleSettingsPanel.Children.OfType<CheckBox>())
                cb.Content = ComponentLabel(cb.Name.Replace("_Visible", ""));
            foreach (var rb in OptionsSettingsPanel.Children.OfType<RadioButton>())
                rb.Content = ComponentLabel(rb.Name.Replace("_Option", ""));
        }

        private static string ComponentLabel(string id) =>
            AddinText.Label(id == "KleiKodesh" ? "DocDesign" : id);

        private void InitializeLanguage()
        {
            bool english = AddinUiLanguage.IsEnglish;
            EnglishLanguageRadio.IsChecked = english;
            HebrewLanguageRadio.IsChecked  = !english;
            EnglishLanguageRadio.Checked += (_, __) => SwitchLanguage(AddinUiLanguage.English);
            HebrewLanguageRadio.Checked  += (_, __) => SwitchLanguage(AddinUiLanguage.Hebrew);
        }

        // Saves the language, relabels the ribbon and this view; open panes keep their
        // language until Word restarts, so say so.
        private void SwitchLanguage(string lang)
        {
            if (AddinUiLanguage.Current == lang) return;
            AddinUiLanguage.Set(lang);
            ApplyTexts();
            BuildShortcutRows();   // the rows carry command labels, so they are rebuilt
            try { _ribbon?.Invalidate(); } catch { }
            MessageBox.Show(
                AddinUiLanguage.T("ייתכן שחלק מההגדרות יחולו רק לאחר הפעלה מחדש של Word.",
                                  "Some settings may only take effect after Word is restarted."),
                AddinText.Label("Settings"), MessageBoxButton.OK, MessageBoxImage.Information, MessageBoxResult.OK,
                AddinUiLanguage.IsEnglish ? MessageBoxOptions.None : MessageBoxOptions.RtlReading | MessageBoxOptions.RightAlign);
        }

        private void InitializeControls()
        {
            // cb.Name IS the registry key (e.g. "KitveiHakodesh_Visible") — do not rename the controls.
            foreach (CheckBox cb in VisibleSettingsPanel.Children.OfType<CheckBox>())
            {
                cb.IsChecked = SettingsManager.GetBool("Ribbon", cb.Name, true);
                cb.Checked   += (_, __) =>
                {
                    SettingsManager.Save("Ribbon", cb.Name, true);
                    _ribbon.InvalidateControl(cb.Name.Replace("_Visible", ""));
                };
                cb.Unchecked += (_, __) =>
                {
                    SettingsManager.Save("Ribbon", cb.Name, false);
                    string componentId = cb.Name.Replace("_Visible", "");
                    _ribbon.InvalidateControl(componentId);
                    // If the corresponding option radio was selected, fall back to Settings
                    var rb = (RadioButton)FindName($"{componentId}_Option");
                    if (rb?.IsChecked == true)
                    {
                        rb.IsChecked = false;
                        Settings_Option.IsChecked = true;
                        SettingsManager.Save("Ribbon", "DefaultButton", "Settings");
                    }
                };
            }

            // rb.Name stripped of "_Option" IS the saved DefaultButton value — do not rename the controls.
            string defaultButtonId = SettingsManager.Get("Ribbon", "DefaultButton", "Settings");
            foreach (RadioButton rb in OptionsSettingsPanel.Children.OfType<RadioButton>())
            {
                rb.IsChecked = rb.Name.Replace("_Option", "") == defaultButtonId;
                rb.Checked += (_, __) =>
                    SettingsManager.Save("Ribbon", "DefaultButton", rb.Name.Replace("_Option", ""));
            }

            ChkTurnOffUpdates.IsChecked = SettingsManager.GetBool("UpdateChecker", "TurnOffUpdates", false);
            ChkTurnOffUpdates.Checked   += (_, __) => SettingsManager.Save("UpdateChecker", "TurnOffUpdates", true);
            ChkTurnOffUpdates.Unchecked += (_, __) => SettingsManager.Save("UpdateChecker", "TurnOffUpdates", false);

            BtnReset.Click += (_, __) =>
            {
                foreach (CheckBox cb in VisibleSettingsPanel.Children.OfType<CheckBox>())
                    if (cb is CheckBox) cb.IsChecked = true;
                foreach (RadioButton rb in OptionsSettingsPanel.Children.OfType<RadioButton>())
                    if (rb is RadioButton) rb.IsChecked = false;
                Settings_Option.IsChecked = true;
                ChkTurnOffUpdates.IsChecked = false;
                // Reset never touches the UI language: keep it across the clear.
                string language = AddinUiLanguage.Current;
                SettingsManager.ClearAll();
                AddinUiLanguage.Set(language);
                try { _ribbon?.Invalidate(); } catch { }
                MessageBox.Show(AddinUiLanguage.T("התוכנה אופסה בהצלחה - אנא התחל את וורד מחדש",
                                                  "The add-in was reset - please restart Word"));
            };
        }
    }
}
