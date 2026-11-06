package com.kredia.controller;

import com.kredia.dto.investment.MarketStrategicSummaryRequest;
import com.kredia.dto.investment.PortfolioPositionDTO;
import com.kredia.dto.investment.PortfolioPositionResponseDTO;
import com.kredia.dto.investment.StrategyCreationResponseDTO;
import com.kredia.entity.investment.*;
import com.kredia.enums.AssetCategory;
import com.kredia.enums.OrderStatus;
import com.kredia.enums.RiskLevel;
import com.kredia.service.InvestmentService;
import com.kredia.service.MarketPriceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/investments")
public class InvestmentController {

    private final InvestmentService investmentService;
    private final MarketPriceService marketPriceService;

    @Autowired
    public InvestmentController(InvestmentService investmentService, MarketPriceService marketPriceService) {
        this.investmentService = investmentService;
        this.marketPriceService = marketPriceService;
    }

    // ==================== InvestmentAsset Endpoints ====================
    
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/assets")
    public ResponseEntity<InvestmentAsset> createAsset(@RequestBody InvestmentAsset asset) {
        // Set default values if not provided
        if (asset.getCategory() == null) {
            asset.setCategory(AssetCategory.STOCK);
        }
        if (asset.getRiskLevel() == null) {
            asset.setRiskLevel(RiskLevel.MEDIUM);
        }
        InvestmentAsset createdAsset = investmentService.createAsset(asset);
        return new ResponseEntity<>(createdAsset, HttpStatus.CREATED);
    }

    @GetMapping("/assets/{id}")
    public ResponseEntity<InvestmentAsset> getAssetById(@PathVariable Long id) {
        return investmentService.getAssetById(id)
                .map(asset -> new ResponseEntity<>(asset, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @GetMapping("/assets")
    public ResponseEntity<List<InvestmentAsset>> getAllAssets() {
        List<InvestmentAsset> assets = investmentService.getAllAssets();
        return new ResponseEntity<>(assets, HttpStatus.OK);
    }

    @GetMapping("/assets/check-favorite/{symbol}")
    public ResponseEntity<?> checkAssetFavorite(@PathVariable String symbol) {
        return investmentService.getAssetBySymbol(symbol)
                .map(asset -> ResponseEntity.ok(Map.of(
                        "exists", true,
                        "symbol", asset.getSymbol(),
                        "assetId", asset.getAssetId()
                )))
                .orElse(ResponseEntity.ok(Map.of("exists", false)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/assets/{id}")
    public ResponseEntity<InvestmentAsset> updateAsset(@PathVariable Long id, @RequestBody InvestmentAsset assetDetails) {
        try {
            InvestmentAsset updatedAsset = investmentService.updateAsset(id, assetDetails);
            return new ResponseEntity<>(updatedAsset, HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/assets/{id}")
    public ResponseEntity<Void> deleteAsset(@PathVariable Long id) {
        try {
            investmentService.deleteAsset(id);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/assets/symbol/{symbol}")
    public ResponseEntity<InvestmentAsset> getAssetBySymbol(@PathVariable String symbol) {
        return investmentService.getAssetBySymbol(symbol)
                .map(asset -> new ResponseEntity<>(asset, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @GetMapping("/assets/category/{category}")
    public ResponseEntity<List<InvestmentAsset>> getAssetsByCategory(@PathVariable AssetCategory category) {
        List<InvestmentAsset> assets = investmentService.getAssetsByCategory(category);
        return new ResponseEntity<>(assets, HttpStatus.OK);
    }

    @GetMapping("/assets/risk/{riskLevel}")
    public ResponseEntity<List<InvestmentAsset>> getAssetsByRiskLevel(@PathVariable RiskLevel riskLevel) {
        List<InvestmentAsset> assets = investmentService.getAssetsByRiskLevel(riskLevel);
        return new ResponseEntity<>(assets, HttpStatus.OK);
    }

    // ==================== InvestmentOrder Endpoints ====================
    
    @PostMapping("/orders")
    public ResponseEntity<InvestmentOrder> createOrder(@RequestBody InvestmentOrder order) {
        try {
            InvestmentOrder createdOrder = investmentService.createOrder(order);
            return new ResponseEntity<>(createdOrder, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            System.out.println("Error creating order: " + e.getMessage());
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<InvestmentOrder> getOrderById(@PathVariable Long id) {
        return investmentService.getOrderById(id)
                .map(order -> new ResponseEntity<>(order, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @GetMapping("/orders")
    public ResponseEntity<List<InvestmentOrder>> getAllOrders() {
        List<InvestmentOrder> orders = investmentService.getAllOrders();
        return new ResponseEntity<>(orders, HttpStatus.OK);
    }

    @PutMapping("/orders/{id}")
    public ResponseEntity<InvestmentOrder> updateOrder(@PathVariable Long id, @RequestBody InvestmentOrder orderDetails) {
        try {
            InvestmentOrder updatedOrder = investmentService.updateOrder(id, orderDetails);
            return new ResponseEntity<>(updatedOrder, HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @DeleteMapping("/orders/{id}")
    public ResponseEntity<Void> deleteOrder(@PathVariable Long id) {
        try {
            investmentService.deleteOrder(id);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/orders/user/{userId}")
    public ResponseEntity<List<InvestmentOrder>> getOrdersByUserId(@PathVariable Long userId) {
        List<InvestmentOrder> orders = investmentService.getOrdersByUserId(userId);
        return new ResponseEntity<>(orders, HttpStatus.OK);
    }

    @GetMapping("/orders/asset/{assetSymbol}")
    public ResponseEntity<List<InvestmentOrder>> getOrdersByAssetSymbol(@PathVariable String assetSymbol) {
        List<InvestmentOrder> orders = investmentService.getOrdersByAssetSymbol(assetSymbol);
        return new ResponseEntity<>(orders, HttpStatus.OK);
    }

    @GetMapping("/orders/status/{status}")
    public ResponseEntity<List<InvestmentOrder>> getOrdersByStatus(@PathVariable OrderStatus status) {
        List<InvestmentOrder> orders = investmentService.getOrdersByStatus(status);
        return new ResponseEntity<>(orders, HttpStatus.OK);
    }

    @GetMapping("/orders/user/{userId}/status/{status}")
    public ResponseEntity<List<InvestmentOrder>> getOrdersByUserIdAndStatus(@PathVariable Long userId, @PathVariable OrderStatus status) {
        List<InvestmentOrder> orders = investmentService.getOrdersByUserIdAndStatus(userId, status);
        return new ResponseEntity<>(orders, HttpStatus.OK);
    }

    // ==================== InvestmentStrategy Endpoints ====================
    
    @PostMapping("/strategies")
    public ResponseEntity<StrategyCreationResponseDTO> createStrategy(@RequestBody InvestmentStrategy strategy) {
        try {
            StrategyCreationResponseDTO createdStrategy = investmentService.createStrategy(strategy);
            return new ResponseEntity<>(createdStrategy, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping("/strategies/{id}")
    public ResponseEntity<InvestmentStrategy> getStrategyById(@PathVariable Long id) {
        return investmentService.getStrategyById(id)
                .map(strategy -> new ResponseEntity<>(strategy, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @GetMapping("/strategies")
    public ResponseEntity<List<InvestmentStrategy>> getAllStrategies() {
        List<InvestmentStrategy> strategies = investmentService.getAllStrategies();
        return new ResponseEntity<>(strategies, HttpStatus.OK);
    }

    @PutMapping("/strategies/{id}")
    public ResponseEntity<InvestmentStrategy> updateStrategy(@PathVariable Long id, @RequestBody InvestmentStrategy strategyDetails) {
        try {
            InvestmentStrategy updatedStrategy = investmentService.updateStrategy(id, strategyDetails);
            return new ResponseEntity<>(updatedStrategy, HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @DeleteMapping("/strategies/{id}")
    public ResponseEntity<Void> deleteStrategy(@PathVariable Long id) {
        try {
            investmentService.deleteStrategy(id);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/strategies/user/{userId}")
    public ResponseEntity<List<InvestmentStrategy>> getStrategiesByUserId(@PathVariable Long userId) {
        List<InvestmentStrategy> strategies = investmentService.getStrategiesByUserId(userId);
        return new ResponseEntity<>(strategies, HttpStatus.OK);
    }

    @GetMapping("/strategies/active/{isActive}")
    public ResponseEntity<List<InvestmentStrategy>> getStrategiesByActiveStatus(@PathVariable Boolean isActive) {
        List<InvestmentStrategy> strategies = investmentService.getStrategiesByActiveStatus(isActive);
        return new ResponseEntity<>(strategies, HttpStatus.OK);
    }

    @GetMapping("/strategies/user/{userId}/active/{isActive}")
    public ResponseEntity<List<InvestmentStrategy>> getStrategiesByUserIdAndActiveStatus(@PathVariable Long userId, @PathVariable Boolean isActive) {
        List<InvestmentStrategy> strategies = investmentService.getStrategiesByUserIdAndActiveStatus(userId, isActive);
        return new ResponseEntity<>(strategies, HttpStatus.OK);
    }

    // ==================== PortfolioPosition Endpoints ====================
    
    @PostMapping("/positions")
    public ResponseEntity<PortfolioPosition> createPosition(@RequestBody PortfolioPositionDTO positionDTO) {
        try {
            System.out.println("Creating position for user ID: " + positionDTO.getUserId() + ", Asset Symbol: " + positionDTO.getAssetSymbol());
            
            if (positionDTO.getUserId() == null || positionDTO.getAssetSymbol() == null) {
                return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
            }
            
            PortfolioPosition createdPosition = investmentService.createPositionFromDTO(positionDTO);
            return new ResponseEntity<>(createdPosition, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            System.out.println("Error creating position: " + e.getMessage());
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping("/positions/{id}")
    public ResponseEntity<PortfolioPositionResponseDTO> getPositionById(@PathVariable Long id) {
        return investmentService.getPositionWithProfitById(id)
                .map(position -> new ResponseEntity<>(position, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @GetMapping("/positions")
    public ResponseEntity<List<PortfolioPositionResponseDTO>> getAllPositions() {
        List<PortfolioPositionResponseDTO> positions = investmentService.getAllPositionsWithProfit();
        return new ResponseEntity<>(positions, HttpStatus.OK);
    }

    @PutMapping("/positions/{id}")
    public ResponseEntity<PortfolioPosition> updatePosition(@PathVariable Long id, @RequestBody PortfolioPosition positionDetails) {
        try {
            PortfolioPosition updatedPosition = investmentService.updatePosition(id, positionDetails);
            return new ResponseEntity<>(updatedPosition, HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @DeleteMapping("/positions/{id}")
    public ResponseEntity<Void> deletePosition(@PathVariable Long id) {
        try {
            investmentService.deletePosition(id);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/positions/user/{userId}")
    public ResponseEntity<List<PortfolioPositionResponseDTO>> getPositionsByUserId(@PathVariable Long userId) {
        List<PortfolioPositionResponseDTO> positions = investmentService.getPositionsWithProfitByUserId(userId);
        return new ResponseEntity<>(positions, HttpStatus.OK);
    }

    @GetMapping("/positions/asset/{assetId}")
    public ResponseEntity<List<PortfolioPosition>> getPositionsByAssetId(@PathVariable Long assetId) {
        List<PortfolioPosition> positions = investmentService.getPositionsByAssetId(assetId);
        return new ResponseEntity<>(positions, HttpStatus.OK);
    }

    @GetMapping("/positions/user/{userId}/asset/{assetSymbol}")
    public ResponseEntity<PortfolioPositionResponseDTO> getPositionByUserIdAndAssetSymbol(@PathVariable Long userId, @PathVariable String assetSymbol) {
        return investmentService.getPositionWithProfitByUserIdAndAssetSymbol(userId, assetSymbol)
                .map(position -> new ResponseEntity<>(position, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    // ==================== Traceability Endpoints ====================
    
    @GetMapping("/orders/strategy/{strategyId}")
    public ResponseEntity<List<InvestmentOrder>> getOrdersByStrategy(@PathVariable Long strategyId) {
        List<InvestmentOrder> orders = investmentService.getOrdersByStrategy(strategyId);
        return new ResponseEntity<>(orders, HttpStatus.OK);
    }

    @GetMapping("/orders/strategy/{strategyId}/pending")
    public ResponseEntity<List<InvestmentOrder>> getPendingOrdersByStrategy(@PathVariable Long strategyId) {
        List<InvestmentOrder> orders = investmentService.getPendingOrdersByStrategy(strategyId);
        return new ResponseEntity<>(orders, HttpStatus.OK);
    }

    @GetMapping("/positions/strategy/{strategyId}")
    public ResponseEntity<List<PortfolioPosition>> getPositionsByStrategy(@PathVariable Long strategyId) {
        List<PortfolioPosition> positions = investmentService.getPositionsByStrategy(strategyId);
        return new ResponseEntity<>(positions, HttpStatus.OK);
    }

    // ==================== AI Market Insight Endpoint ====================

    @PostMapping("/market-strategy-summary")
    public ResponseEntity<Map<String, Object>> generateMarketStrategySummary(
            @RequestBody(required = false) MarketStrategicSummaryRequest request
    ) {
        try {
            String language = request != null ? request.getLanguage() : null;
            String tone = request != null ? request.getTone() : null;
            String additionalContext = request != null ? request.getAdditionalContext() : null;

            Map<String, Object> summary = investmentService.generateStrategicMarketSummary(
                    language,
                    tone,
                    additionalContext
            );

            HttpStatus status = "error".equals(summary.get("status"))
                    ? HttpStatus.BAD_GATEWAY
                    : HttpStatus.OK;

            return new ResponseEntity<>(summary, status);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ==================== Market Chart Endpoints ====================

    @GetMapping("/market/search")
    public ResponseEntity<List<Map<String, Object>>> searchMarketAssets(
            @RequestParam("q") String query,
            @RequestParam(defaultValue = "10") int limit
    ) {
        try {
            List<Map<String, Object>> results = marketPriceService.searchAssets(query, limit);
            return new ResponseEntity<>(results, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.BAD_GATEWAY);
        }
    }

    @GetMapping("/market/chart/{symbol}")
    public ResponseEntity<List<java.math.BigDecimal>> getHistoricalPrices(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "1d") String range,
            @RequestParam(defaultValue = "1m") String interval
    ) {
        try {
            List<java.math.BigDecimal> prices = marketPriceService.getHistoricalPrices(symbol, range, interval);
            return new ResponseEntity<>(prices, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.BAD_GATEWAY);
        }
    }
}
