using Microsoft.Office.Interop.Word;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace KleiKodesh.Helpers
{
    /// <summary>
    /// Word-level keyboard shortcuts for the add-in's commands: from inside a document
    /// a key combination opens the matching tool, without reaching for the ribbon.
    ///
    /// Word cannot bind a key to a .NET method - wdKeyCategoryMacro, a built-in
    /// command, a style and the like are the only targets it accepts - so a shortcut
    /// here points at a VBA macro in the optional macros template
    /// (<see cref="VbaMacrosTemplate"/>), which forwards to the very same
    /// AddinCommands code the ribbon runs.
    ///
    /// Everything below was measured against live Word 16.0, because the behaviour is
    /// not what the documentation suggests and each point decided the design:
    ///
    ///  * KeyBindings.Add VALIDATES the macro name and throws ("Word cannot change the
    ///    function of the specified key") when it cannot resolve it. A shortcut
    ///    therefore cannot be written before the macros template is installed AND
    ///    loaded - which forces the install order, and is why <see cref="IsReady"/>
    ///    exists and the settings pane offers to install first.
    ///  * The name Word accepts is Module.Macro ("KleiKodesh.Nakdan"), NOT
    ///    Project.Module.Macro: the VBA project name ("Kodesh") is not part of it.
    ///  * What Word STORES back is a three-part name whose first segment it writes as
    ///    "Normal" whatever template actually holds the macro
    ///    ("Normal.KleiKodesh.Nakdan"). So a stored command is recognised by its
    ///    TRAILING ".Module.Macro", never by the whole string - see <see cref="IdOf"/>.
    ///  * Application.FindKey never returns null. A free combination comes back as a
    ///    KeyBinding with KeyCategory = wdKeyCategoryNil and an empty Command. It also
    ///    throws outright when CustomizationContext points at a template that has since
    ///    been unloaded, so the context is set before every read.
    ///  * Bindings live in the macros template itself, not in the user's Normal.dotm.
    ///    Normal looks like the obvious home - it is where Word's own Customize
    ///    Keyboard dialog puts them - but NormalTemplate.Save() BLOCKS INDEFINITELY
    ///    when another Word instance holds Normal.dotm, which hung a test run here.
    ///    Keeping the bindings in our own template also means removing the template
    ///    removes the shortcuts with it, and the user's personal template is never
    ///    written to at all.
    ///
    /// The macro names used as targets are the ASCII command ids, which
    /// Ribbon\build_macros_template.py puts in BOTH template flavours for this reason:
    /// a shortcut then survives the user switching macro names between Hebrew and
    /// English, and does not depend on Windows' "language for non-Unicode programs".
    ///
    /// Because the template can be replaced (a language switch) or removed, the user's
    /// choices are also recorded in the registry as intent, and <see cref="ReapplyAll"/>
    /// re-creates any recorded shortcut that the template no longer carries. The flow is
    /// one-directional - the registry is what the user asked for, the template is what
    /// Word actually does - so there is no second truth to drift.
    /// </summary>
    public static class WordShortcuts
    {
        const string Section = "Shortcuts";

        /// <summary>The VBA module inside the macros template (see build_macros_template.py).</summary>
        const string Module = "KleiKodesh";

        // Word's modifier bits. BuildKeyCode is a plain sum of these, verified against
        // live Word: Ctrl + Shift + K = 512 + 256 + 75 = 843. No COM call needed.
        public const int Ctrl = 512, Shift = 256, Alt = 1024;

        /// <summary>
        /// The commands a shortcut can be assigned to: every command the macros
        /// template exposes, which is every command in <see cref="Ribbon.VbaCommands"/>.
        /// Settings and DuplicatePane are deliberately absent there - they act on the
        /// add-in's own panes rather than on the document - so they are absent here too.
        /// Each id is at once the ribbon control id, the AddinText key and the macro name.
        /// </summary>
        public static readonly string[] CommandIds =
        {
            "KitveiHakodesh", "Kiwix", "WebSites", "DocDesign", "Nakdan", "RegexFind",
            "SearchText", "SearchBook", "CompareText", "OpenLink", "About",
        };

        static Application App => Globals.ThisAddIn.Application;

        // ── the macros template, which has to be loaded before anything can be bound ──

        /// <summary>
        /// The macros template as Word has it loaded in THIS session, or null. Installed
        /// is not the same as loaded: Word reads its STARTUP folder once, at start, so a
        /// template installed a moment ago is only there after a restart.
        /// </summary>
        public static Template LoadedTemplate()
        {
            string installed = VbaMacrosTemplate.Installed;
            if (installed == null) return null;
            string fileName = VbaMacrosTemplate.FileName(installed);
            try
            {
                foreach (Template t in App.Templates)
                    if (string.Equals(t.Name, fileName, StringComparison.OrdinalIgnoreCase))
                        return t;
            }
            catch { }
            return null;
        }

        /// <summary>True when a shortcut can actually be assigned right now.</summary>
        public static bool IsReady => LoadedTemplate() != null;

        /// <summary>True when the template is in STARTUP but Word has not loaded it yet.</summary>
        public static bool NeedsWordRestart => VbaMacrosTemplate.Installed != null && !IsReady;

        // ── key codes ────────────────────────────────────────────────────────────────

        /// <summary>
        /// Word's key code for a base key plus modifiers. The base key is a Windows
        /// virtual-key code, which is what Word's WdKey values are for the range we
        /// accept (A-Z = 65-90, 0-9 = 48-57, F1-F12 = 112-123).
        /// </summary>
        public static int KeyCode(int virtualKey, bool ctrl, bool shift, bool alt) =>
            virtualKey + (ctrl ? Ctrl : 0) + (shift ? Shift : 0) + (alt ? Alt : 0);

        /// <summary>
        /// A combination Word will accept from us. Ctrl or Alt has to be in it: a bare
        /// key, or Shift plus a key, is how the user types, and taking that over would
        /// break the document rather than shorten a path.
        /// </summary>
        public static bool IsUsable(int virtualKey, bool ctrl, bool shift, bool alt)
        {
            if (!ctrl && !alt) return false;
            return virtualKey >= 'A' && virtualKey <= 'Z'
                || virtualKey >= '0' && virtualKey <= '9'
                || virtualKey >= 112 && virtualKey <= 123;
        }

        /// <summary>
        /// "Ctrl+Shift+K". Written here rather than taken from Word's own KeyString so
        /// the pane shows the same text whether or not Word is reachable, and in the
        /// order the user reads it.
        /// </summary>
        public static string Describe(int keyCode)
        {
            if (keyCode == 0) return null;
            var text = new StringBuilder();
            if ((keyCode & Ctrl) != 0) text.Append("Ctrl+");
            if ((keyCode & Alt) != 0) text.Append("Alt+");
            if ((keyCode & Shift) != 0) text.Append("Shift+");
            text.Append(BaseKeyName(keyCode & ~(Ctrl | Alt | Shift)));
            return text.ToString();
        }

        static string BaseKeyName(int virtualKey)
        {
            if (virtualKey >= 112 && virtualKey <= 123) return "F" + (virtualKey - 111);
            if (virtualKey >= 'A' && virtualKey <= 'Z' || virtualKey >= '0' && virtualKey <= '9')
                return ((char)virtualKey).ToString();
            return virtualKey.ToString(CultureInfo.InvariantCulture);
        }

        // ── reading what Word currently holds ────────────────────────────────────────

        /// <summary>
        /// What a combination is bound to anywhere in Word - our own template, the
        /// user's Normal.dotm, another add-in's template, or Word itself - or null when
        /// it is free. This is the conflict check: FindKey resolves across every
        /// customization context, which is exactly what "already taken" means.
        /// </summary>
        public static ShortcutHolder Holder(int keyCode)
        {
            try
            {
                // FindKey throws when the context is a template that has gone away, so
                // put it somewhere that certainly still exists before asking.
                App.CustomizationContext = App.NormalTemplate;
                object missing = Type.Missing;
                KeyBinding binding = App.get_FindKey(keyCode, ref missing);
                if (binding == null) return null;
                if (binding.KeyCategory == WdKeyCategory.wdKeyCategoryNil) return null;
                return new ShortcutHolder(binding.KeyCategory, binding.Command, IdOf(binding.Command));
            }
            catch
            {
                // Treat an unreadable state as "cannot tell", not as "free": claiming a
                // combination is free when we could not look would steal it silently.
                return ShortcutHolder.Unknown;
            }
        }

        /// <summary>
        /// Our command id behind a stored Command string, or null when the binding is
        /// not one of ours. Matches the trailing ".Module.Macro" because Word rewrites
        /// the leading segment (see the class remarks).
        /// </summary>
        public static string IdOf(string command)
        {
            if (string.IsNullOrEmpty(command)) return null;
            foreach (string id in CommandIds)
            {
                string tail = Module + "." + id;
                if (command.Equals(tail, StringComparison.OrdinalIgnoreCase)
                    || command.EndsWith("." + tail, StringComparison.OrdinalIgnoreCase))
                    return id;
            }
            return null;
        }

        /// <summary>
        /// The combination currently bound to each of our commands, read from the
        /// template Word has loaded. Empty when the template is not loaded - in that
        /// case the pane shows the recorded intent instead, which is all we can honestly
        /// say before Word has read the template.
        /// </summary>
        public static Dictionary<string, int> Current()
        {
            var found = new Dictionary<string, int>();
            Template template = LoadedTemplate();
            if (template == null) return found;
            try
            {
                App.CustomizationContext = template;
                foreach (KeyBinding binding in App.KeyBindings)
                {
                    if (binding.KeyCategory != WdKeyCategory.wdKeyCategoryMacro) continue;
                    string id = IdOf(binding.Command);
                    if (id != null && !found.ContainsKey(id))
                        found[id] = binding.KeyCode;
                }
            }
            catch { }
            return found;
        }

        // ── changing it ──────────────────────────────────────────────────────────────

        /// <summary>
        /// Binds <paramref name="keyCode"/> to the command, replacing whatever we had
        /// bound to that command before, and records the choice. Throws with Word's own
        /// message when Word refuses - the caller shows it.
        /// </summary>
        public static void Assign(string commandId, int keyCode)
        {
            Template template = LoadedTemplate();
            if (template == null)
                throw new InvalidOperationException("macros template not loaded");

            App.CustomizationContext = template;
            ClearIn(template, commandId);

            object missing = Type.Missing;
            App.KeyBindings.Add(WdKeyCategory.wdKeyCategoryMacro, Module + "." + commandId,
                                keyCode, ref missing, ref missing);
            Save(template);
            SettingsManager.Save(Section, commandId, keyCode);
        }

        /// <summary>Removes the command's shortcut, and the record of it.</summary>
        public static void Clear(string commandId)
        {
            Template template = LoadedTemplate();
            if (template != null)
            {
                App.CustomizationContext = template;
                ClearIn(template, commandId);
                Save(template);
            }
            SettingsManager.Save(Section, commandId, 0);
        }

        /// <summary>
        /// Takes every shortcut of ours out of the template - what the settings pane
        /// calls on the way to removing the macros template, so removing it never leaves
        /// a binding behind that points at a macro which is no longer there. The
        /// recorded intent is kept, so re-installing the template brings the shortcuts
        /// back.
        /// </summary>
        public static void ClearAllBindings()
        {
            Template template = LoadedTemplate();
            if (template == null) return;
            try
            {
                App.CustomizationContext = template;
                foreach (string id in CommandIds)
                    ClearIn(template, id);
                Save(template);
            }
            catch { }
        }

        // Clears by walking the collection rather than by FindKey: FindKey would answer
        // for whatever context holds the key, and we must only ever remove our own.
        static void ClearIn(Template template, string commandId)
        {
            for (int i = App.KeyBindings.Count; i >= 1; i--)
            {
                KeyBinding binding = App.KeyBindings[i];
                if (binding.KeyCategory == WdKeyCategory.wdKeyCategoryMacro
                    && IdOf(binding.Command) == commandId)
                    binding.Clear();
            }
        }

        // A loaded global template is not marked dirty for us, so say so before saving,
        // or Word quietly skips the write and the shortcut is gone at the next start.
        static void Save(Template template)
        {
            template.Saved = false;
            template.Save();
        }

        // ── repairing after the template was replaced or reinstalled ─────────────────

        /// <summary>
        /// Re-creates any recorded shortcut the loaded template does not carry. Runs at
        /// add-in startup, which is what makes switching the macros template between
        /// Hebrew and English names - it replaces the file, bindings and all - something
        /// the user does not have to think about.
        ///
        /// A combination that has since been taken by something else is left alone: the
        /// pane will show it as a conflict rather than Word silently losing a shortcut it
        /// did not create.
        /// </summary>
        public static void ReapplyAll()
        {
            Template template = LoadedTemplate();
            if (template == null) return;

            Dictionary<string, int> live = Current();
            bool changed = false;
            foreach (string id in CommandIds)
            {
                int wanted = SettingsManager.GetInt(Section, id, 0);
                if (wanted == 0) continue;
                if (live.TryGetValue(id, out int have) && have == wanted) continue;

                ShortcutHolder holder = Holder(wanted);
                if (holder != null && holder.CommandId != id) continue;

                try
                {
                    App.CustomizationContext = template;
                    ClearIn(template, id);
                    object missing = Type.Missing;
                    App.KeyBindings.Add(WdKeyCategory.wdKeyCategoryMacro, Module + "." + id,
                                        wanted, ref missing, ref missing);
                    changed = true;
                }
                catch { }
            }
            if (changed)
                try { Save(template); } catch { }
        }

        /// <summary>The combination the user asked for, whether or not Word holds it.</summary>
        public static int Recorded(string commandId) => SettingsManager.GetInt(Section, commandId, 0);
    }

    /// <summary>Whatever already owns a key combination.</summary>
    public sealed class ShortcutHolder
    {
        /// <summary>Word could not be asked - neither taken nor known to be free.</summary>
        public static readonly ShortcutHolder Unknown = new ShortcutHolder(WdKeyCategory.wdKeyCategoryNil, null, null);

        public readonly WdKeyCategory Category;

        /// <summary>Word's stored command string, e.g. "SmallCaps" or "Normal.KleiKodesh.Nakdan".</summary>
        public readonly string Command;

        /// <summary>Our command id when this is one of our own shortcuts, else null.</summary>
        public readonly string CommandId;

        public ShortcutHolder(WdKeyCategory category, string command, string commandId)
        {
            Category = category; Command = command; CommandId = commandId;
        }

        public bool IsUnknown => Command == null && CommandId == null;

        /// <summary>A built-in Word command, e.g. Ctrl+Shift+K is SmallCaps.</summary>
        public bool IsBuiltInCommand => Category == WdKeyCategory.wdKeyCategoryCommand;
    }
}
