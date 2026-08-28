from pathlib import Path

path = Path('login.html')
text = path.read_text(encoding='utf-8')

anchor = '''    let redirectingToProfile = false;\n\n    async function goToProfile(session) {\n      if (!session || redirectingToProfile) return;\n'''

replacement = '''    let redirectingToProfile = false;\n\n    async function syncPendingDaily30AfterLogin(session) {\n      const user = session?.user || null;\n      if (!user || !supabaseClient) return false;\n\n      let guestId = null;\n      try {\n        const savedGuest = JSON.parse(localStorage.getItem("kviztogo_guest_identity_v1") || "null");\n        guestId = savedGuest?.id || null;\n      } catch (_) {}\n\n      try {\n        if (guestId) {\n          const attached = await supabaseClient.rpc("daily30_attach_guest_to_current_user", {\n            p_guest_player_key: `guest:${guestId}`\n          });\n          if (attached.error) {\n            console.warn("Daily30 guest rezultat nije spojen nakon prijave:", attached.error);\n          }\n        }\n\n        const mine = await supabaseClient.rpc("daily30_get_my_results");\n        if (mine.error) throw mine.error;\n\n        if (mine.data && typeof mine.data === "object") {\n          localStorage.setItem(\n            `kviztogo_daily30_results_v1:user:${user.id}`,\n            JSON.stringify(mine.data)\n          );\n        }\n\n        localStorage.setItem(\n          "kviztogo_daily30_player_context_v1",\n          JSON.stringify({\n            isGuest: false,\n            userId: user.id,\n            guestId: null,\n            name: String(\n              user.user_metadata?.username ||\n              user.user_metadata?.full_name ||\n              user.user_metadata?.name ||\n              user.email?.split("@")[0] ||\n              "Kvizoman"\n            ).trim().slice(0, 40)\n          })\n        );\n\n        return true;\n      } catch (error) {\n        console.warn("Daily30 sinkronizacija nakon prijave nije uspjela:", error);\n        return false;\n      }\n    }\n\n    async function goToProfile(session) {\n      if (!session || redirectingToProfile) return;\n\n      await syncPendingDaily30AfterLogin(session);\n'''

count = text.count(anchor)
if count != 1:
    raise SystemExit(f'Expected exactly one goToProfile anchor, found {count}')

text = text.replace(anchor, replacement, 1)
path.write_text(text, encoding='utf-8')
print('Patched login.html Daily30 post-login sync')
