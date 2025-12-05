import { registerApp } from "~/os"
import { InformationApp } from "~/os/apps/information"
import { SettingsApp } from "~/os/apps/settings"
import { TestApp } from "~/os/apps/test"

registerApp(InformationApp)
registerApp(TestApp)
registerApp(SettingsApp)
