import { App } from "~/os"
import { AboutContent } from "./components"

export class InformationApp extends App {
  static appId = "information"
  static appName = "Information"
  static appIcon = "info"
  static appDescription = "Learn about me :)"
  static appColor = "purple"
  static appProtected = true
  static supportedFileTypes: readonly string[] = []

  id = InformationApp.appId
  name = InformationApp.appName
  icon = InformationApp.appIcon
  description = InformationApp.appDescription
  color = InformationApp.appColor
  defaultSize = { width: 1000, height: 700 }

  constructor() {
    super()
  }

  onLaunch = () => {}

  render = () => {
    return (
      <div class="flex size-full items-center justify-center overflow-auto p-6">
        <AboutContent />
      </div>
    )
  }
}
