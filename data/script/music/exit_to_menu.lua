local ModID = "ReturntoOrient"

if event.OnLeaveUIState[ModID] == nil then -- only add it once (per anno game start)
    print("Skript gestartet")
  local GameLeft_ID = 63 -- or 170/171, but 63 fits more and they all 3 are shown at the same moments -- also when just going to main menu and then back to the game

  local function Do_OnLeaveUIState(UILeft_ID)
     print("Leave detektiert")
    if UILeft_ID == GameLeft_ID then
      game.playSound(1404000857)
      print("Sound abgespielt")
    end
  end
  
  event.OnLeaveUIState[ModID] = function(UILeft_ID)
    local status, err = pcall(Do_OnLeaveUIState,UILeft_ID) -- use seperate function with pcall, because game crashes without lua error, if any error happens in an function called by event. !
    if status==false then -- error
      print(ModID,"ERROR ReturntoOrient: Function Do_OnLeaveUIState had an error: "..tostring(err))
    end
  end
  
end