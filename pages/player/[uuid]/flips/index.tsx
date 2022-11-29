import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { Container } from 'react-bootstrap'
import { initAPI } from '../../../../api/ApiHelper'
import { FlipTracking } from '../../../../components/FlipTracking/FlipTracking'
import Search from '../../../../components/Search/Search'
import { getCacheContolHeader } from '../../../../utils/CacheUtils'
import { numberWithThousandsSeperatorsAsString } from '../../../../utils/Formatter'
import { parseFlipTrackingResponse, parsePlayer } from '../../../../utils/Parser/APIResponseParser'
import { getHeadElement } from '../../../../utils/SSRUtils'

interface Props {
    flipTrackingResponse: any
    player: any
}

function Flipper(props: Props) {
    let flipTrackingResponse = parseFlipTrackingResponse(props.flipTrackingResponse)
    let player = parsePlayer(props.player)

    function getEmbedDescription() {
        if (!flipTrackingResponse.flips || flipTrackingResponse.flips.length === 0) {
            return `There were no flips found for ${player.name}`
        }

        let profitByFinder = {}
        flipTrackingResponse.flips.forEach(flip => {
            if (!flip.finder.label) {
                return
            }
            if (!profitByFinder[flip.finder.label]) {
                profitByFinder[flip.finder.label] = 0
            }
            profitByFinder[flip.finder.label] += flip.profit
        })

        let finderByGroupArray: any[] = []
        Object.keys(profitByFinder).forEach(key => {
            finderByGroupArray.push({
                label: key,
                profit: profitByFinder[key]
            })
        })
        finderByGroupArray = finderByGroupArray.sort((a, b) => b.profit - a.profit)

        let profitByFinderEmbed = ''
        finderByGroupArray.forEach(finderGroup => {
            if (finderGroup.profit > 0) {
                profitByFinderEmbed += `${finderGroup.label}: ${numberWithThousandsSeperatorsAsString(finderGroup.profit)} Coins \n`
            }
        })

        let highestProfitFlipText = `Highest Profit Flip: ${numberWithThousandsSeperatorsAsString(
            flipTrackingResponse.flips[0].profit
        )} Coins \n ${numberWithThousandsSeperatorsAsString(flipTrackingResponse.flips[0].pricePaid)} Coins ➞ ${numberWithThousandsSeperatorsAsString(
            flipTrackingResponse.flips[0].soldFor
        )} Coins (${flipTrackingResponse.flips[0].item.name})`

        return `Found Flips: ${flipTrackingResponse.flips.length} 
                Total Profit: ${numberWithThousandsSeperatorsAsString(flipTrackingResponse.totalProfit)} Coins
                \n ${profitByFinderEmbed} 
                ${highestProfitFlipText}`
    }

    return (
        <div className="page">
            {getHeadElement(
                `Tracked flips of ${player.name}`,
                getEmbedDescription(),
                player.iconUrl?.split('?')[0],
                ['tracker'],
                `Tracked flips of ${player.name}`
            )}
            <Container>
                <Search
                    type="player"
                    currentElement={
                        <p>
                            <span style={{ fontSize: 'larger', marginRight: '20px' }}>Tracked flips of:</span>
                            <Link href={`/player/${player.uuid}`}>
                                <span style={{ cursor: 'pointer' }}>
                                    <Image
                                        crossOrigin="anonymous"
                                        className="playerHeadIcon"
                                        src={player.iconUrl}
                                        height="32"
                                        width="32"
                                        alt=""
                                        style={{ marginRight: '10px' }}
                                    />
                                    <span>{player.name}</span>
                                </span>
                            </Link>
                        </p>
                    }
                />
                <FlipTracking totalProfit={flipTrackingResponse.totalProfit} trackedFlips={flipTrackingResponse.flips} />
            </Container>
        </div>
    )
}

export const getServerSideProps = async ({ res, params }) => {
    res.setHeader('Cache-Control', getCacheContolHeader())
    let api = initAPI(true)
    let apiResponses = await Promise.all([api.getPlayerName(params.uuid), api.getTrackedFlipsForPlayer(params.uuid)].map(p => p.catch(e => null)))

    return {
        props: {
            player: {
                uuid: params.uuid,
                name: apiResponses[0]
            },
            flipTrackingResponse: apiResponses[1] || { flips: [], totalProfit: 0 }
        }
    }
}

export default Flipper
